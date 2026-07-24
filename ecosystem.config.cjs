module.exports = {
    apps: [
        {
            name: "frontend-inventarios-bienes",
            script: "node_modules/serve/build/main.js",
            args: "-s dist -l 5173",
            interpreter: "node"
        }
    ]
};