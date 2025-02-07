import swaggerJSDoc from 'swagger-jsdoc';
import { Options } from 'swagger-jsdoc';

console.log(process.env.API_HOST);

const options: Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'STARLAWFIRM AUTH SERVICE API',
      version: '1.0.0',
      description: 'STARLAWFIRM AUTH SERVICE API 문서입니다.',
    },
    servers: [
      {
        url: `http://${process.env.API_HOST}`,
      },
    ],
  },
  // Swagger가 스캔할 소스 코드 경로
  apis: ['src/**/*.ts'], 
};

export const swaggerSpec = swaggerJSDoc(options);
