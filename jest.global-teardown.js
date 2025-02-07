const { redisClient } = require('./src/config/redis');
const { AppDataSource } = require('./src/data-source');

module.exports = async function globalTeardown() {
  try {
    // Redis 연결 해제 (버전 및 환경에 따라 quit 또는 disconnect를 사용)
    if (redisClient.isOpen) {
      await redisClient.quit();
    }
  } catch (error) {
    console.error('Redis 종료 에러:', error);
  }

  try {
    // DB 연결 해제
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  } catch (error) {
    console.error('DB 종료 에러:', error);
  }
};
