import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { uuid } from 'uuidv4'
import Drive from '@ioc:Adonis/Core/Drive'
import Imagem from 'App/Models/Imagem'
import fs from 'fs'
import { createApi } from 'unsplash-js';
import nodeFetch from 'node-fetch';
import { Random } from 'unsplash-js/dist/methods/photos/types'
import axios from 'axios'

export default class ImagensController {
    private readonly drive = Drive.use('s3')
    public async upload({ request, response }: HttpContextContract) {
        const file = request.file('image', {
            size: '2mb',
            extnames: ['jpg', 'png', 'gif'],
        })
        if (!file) {
            return response.status(400).send({ message: 'Imagem é obrigatória' })
        }
        const key = uuid()
        console.log(file)

        await Imagem.create({ key })

        const content = fs.readFileSync(file.tmpPath as string)

        await this.drive.put(`imagens/${key}`, content)
    }

    public async list({ response }: HttpContextContract) {
        return response.status(200).send(await Imagem.query())
    }

    public async cargaImagens({ response }: HttpContextContract) {
        console.log('AAAAA')
        const unsplash = createApi({
            accessKey: '7tvPWh27NGtFgtvFTS6-QGwCa40JZd4xx9_Jnh-U_lY',
            fetch: nodeFetch,
        });

        const fotos = await unsplash.photos.getRandom({ count: 5 })
        let responseFotos: Random[] = []
        responseFotos = fotos.response as Random[]
        for (let fotoInfo of responseFotos) {
            const contentFoto = await axios({
                method: "get",
                url: fotoInfo.urls.full,
                responseType: 'arraybuffer'
            });
            const key = `${uuid()}.jpg`
            await Imagem.create({ key })
            await this.drive.put(`imagens/${key}`, contentFoto.data)
        }
        return response.status(200).send({ message: 'Carga de imagens concluída' })
    }

    public async showImage({ request, response }: HttpContextContract) {
        const { id } = request.params()
        const imagem = await Imagem.query().where('id', id).firstOrFail()
        const imageContent = await this.drive.getStream(`imagens/${imagem.key}`)

        return response.status(200).header('content-type', 'image/jpeg').stream(imageContent)
    }
}
