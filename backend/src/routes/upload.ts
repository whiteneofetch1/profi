import { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import util from 'util';
import { pipeline } from 'stream';

const pump = util.promisify(pipeline);

export default async function uploadRoutes(fastify: FastifyInstance) {
  fastify.post('/', async (request, reply) => {
    // Basic authentication check
    await fastify.authenticate(request, reply);
    
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: 'Файл не найден' });
    }

    const ext = path.extname(data.filename).toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    if (!allowedExtensions.includes(ext)) {
      return reply.status(400).send({ error: 'Неподдерживаемый формат файла' });
    }

    const uniqueName = crypto.randomUUID() + ext;
    const uploadDir = path.join(__dirname, '..', '..', 'uploads');
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const savePath = path.join(uploadDir, uniqueName);
    await pump(data.file, fs.createWriteStream(savePath));

    // Возвращаем путь относительно корня, учитывая что у нас nginx проксирует /api/uploads
    // ИЛИ мы можем использовать NUXT_PUBLIC_API_URL
    const fileUrl = `/api/uploads/${uniqueName}`;

    return reply.send({
      success: true,
      url: fileUrl,
      fileName: uniqueName
    });
  });
}
