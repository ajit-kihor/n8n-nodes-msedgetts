module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	testMatch: ['**/test/**/*.test.ts'],
	modulePathIgnorePatterns: ['<rootDir>/dist/'],
	verbose: true,
	collectCoverageFrom: ['nodes/**/*.ts', '!nodes/**/*.node.ts'],
	coverageThreshold: {
		global: {
			branches: 70,
			functions: 80,
			lines: 80,
			statements: 80,
		},
	},
	clearMocks: true,
	resetMocks: true,
	restoreMocks: true,
};
