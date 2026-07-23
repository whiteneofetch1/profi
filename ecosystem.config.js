module.exports = {
  apps: [
    {
      name: "fyxi-backend",
      script: "dist/index.js",
      cwd: "./backend",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 5010,
        HOST: "0.0.0.0"
      }
    },
    {
      name: "fyxi-frontend",
      script: ".output/server/index.mjs",
      cwd: "./frontend",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 5011,
        HOST: "0.0.0.0",
        NUXT_PUBLIC_API_URL: "https://fyxi.ru/api"
      }
    }
  ]
};
