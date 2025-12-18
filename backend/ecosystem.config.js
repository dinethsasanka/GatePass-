module.exports = {
  apps: [
    {
      name: "Gate-Pass",
      script: "server.js",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 5000
      },
      error_file: "/var/log/gatepass/error.log",
      out_file: "/var/log/gatepass/output.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss"
    }
  ]
};
