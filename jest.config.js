module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    // 테스트 파일 탐색 패턴 (프로젝트 구조에 맞게 수정 가능)
    testMatch: ['**/tests/**/*.spec.ts', '**/tests/**/*.test.ts'],
    testPathIgnorePatterns: ['<rootDir>/migrations/'],
    // 필요하다면 다음 옵션들도 추가:
    // transformIgnorePatterns: ['<rootDir>/node_modules/'],
    collectCoverageFrom: [
        'src/services/**/*.ts',
        'src/controllers/**/*.ts',
        'src/utils/**/*.ts',
        'src/entities/**/*.ts',
        'src/data-source.ts',
        'src/constants/**/*.ts',
        'src/routes/**/*.ts',
        'src/app.ts',
        'src/main.ts',
    ],
    globalTeardown: './jest.global-teardown.js', // 테스트 종료 후 실행할 teardown 파일
};