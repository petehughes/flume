import babel from "@rollup/plugin-babel";
import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import svgr from "@svgr/rollup";
import external from "rollup-plugin-peer-deps-external";
import postcss from "rollup-plugin-postcss";
import url from "rollup-plugin-url";

import pkg from "./package.json";

export default {
	input: "src/index.ts",
	output: [
		{
			file: pkg.main,
			format: "cjs",
			sourcemap: true,
		},
		{
			file: pkg.module,
			format: "es",
			sourcemap: true,
		},
	],
	external: ["react", "react-dom"],
	plugins: [
		external(),
		url(),
		svgr(),
		resolve(),
		babel({
			extensions: [".js", ".ts", ".tsx"],
			exclude: "node_modules/**",
			babelHelpers: "runtime",
		}),
		typescript({
			tsconfig: "./tsconfig.json",
		}),
		commonjs(),
		postcss({
			modules: true,
			plugins: [require("postcss-nested")],
		}),
	],
};
