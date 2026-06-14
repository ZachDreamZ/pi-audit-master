module.exports = {
	preset: "ts-jest",
	testEnvironment: "node",
	transform: {
		"^.+\\.tsx?$": "ts-jest",
	},
	roots: ["<rootDir>/tests"],
	testMatch: ["**/*.test.ts"],
};
