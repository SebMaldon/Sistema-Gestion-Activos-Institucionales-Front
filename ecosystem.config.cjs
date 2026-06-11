module.exports = {
    apps: [
        {
            name: "inventario-bienes-frontend",
            script: "./node_modules/vite/bin/vite.js",
            args: "preview --host --port 5173",
            interpreter: "node"
        }
    ]
};