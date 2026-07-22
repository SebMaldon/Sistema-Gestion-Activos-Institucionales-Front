module.exports = {
    apps: [
        {
            name: "frontend-inventarios-bienes",
            script: "./node_modules/serve/bin/serve.js",
            args: "-s dist -l 5173",
            interpreter: "node"
        }
    ]
};