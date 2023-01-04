const path = require("path");
const bundleOutputDir = "./dist";

module.exports = {
    entry: {
        main: "./src/examples/main"
    },
    output: {
        filename: "[name].bundle.js",
        path: path.join(__dirname, bundleOutputDir),
        publicPath: 'public/dist/'
    },
    devtool: "source-map",
    resolve: {
        extensions: ['.js', '.ts']
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: ['/node_modules/']
            },
            { test: /\.tsx?$/, loader: "ts-loader" },
            {
                test: /\.css$/i,
                use: ["style-loader", "css-loader"]
            },
            {
                test: /\.wgsl$/,
                use: {
                    loader: "ts-shader-loader"
                }
            }
        ]
    }
};