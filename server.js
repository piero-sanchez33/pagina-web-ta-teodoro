const express = require("express");
const cors = require("cors");
const sql = require("mssql");

const app = express();

app.use(cors());
app.use(express.json());

// CONFIG SQL
const config = {
  user: "DueñaGoodish@goodish",
  password: "-Goodish2026-",
  server: "goodish.database.windows.net",
  database: "tienda",
  port: 1433,
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};

// CONEXIÓN UNA SOLA VEZ
sql.connect(config)
  .then(() => console.log("✔ Conectado a SQL Server"))
  .catch(err => console.log("❌ Error SQL:", err));

// RUTAS
app.get("/", (req, res) => {
  res.send("Servidor funcionando 🚀");
});

app.get("/productos", (req, res) => {
  res.json([
    { id: 1, nombre: "Producto 1", precio: 10 },
    { id: 2, nombre: "Producto 2", precio: 20 }
  ]);
});

// REGISTRO
app.post("/registro", async (req, res) => {
  const { nombre, apellido, correo, password } = req.body;

  try {
    await sql.query`
      INSERT INTO usuarios (NOMBRE_CLI, APELLIDO_CLI, CORREO_CLI, [PASSWORD])
      VALUES (${nombre}, ${apellido}, ${correo}, ${password})
    `;

    res.json({ mensaje: "Usuario guardado en BD" });

  } catch (err) {
    console.log("❌ ERROR:", err);
    res.status(500).send(err.message);
  }
});

// SERVER
app.listen(process.env.PORT || 3000, () => {
  console.log("Servidor corriendo");
});
