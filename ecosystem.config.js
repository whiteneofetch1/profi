module.exports = {
  apps: [
    {
      name: "fyxi-backend",
      script: "dist/index.js",
      cwd: "./backend",
      instances: 1,
      exec_mode: "fork",
      exp_backoff_restart: 1000,
      max_restarts: 15,
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
      exp_backoff_restart: 1000,
      max_restarts: 15,
      env: {
        NODE_ENV: "production",
        PORT: 5011,
        HOST: "0.0.0.0",
        NITRO_HOST: "0.0.0.0",
        NUXT_PUBLIC_API_URL: "https://fyxi.ru/api"
      }
    }
  ]
};
