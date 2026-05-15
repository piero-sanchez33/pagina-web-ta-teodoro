const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(cors());
app.use(express.json());

// Tu carpeta frontend tiene index.html y register.html
app.use(express.static("frontend"));

// CONFIG SUPABASE
const supabaseUrl = "https://oqojlcgkmvbxmmwoexih.supabase.co";
const supabaseKey = "TU_SUPABASE_KEY_AQUI";

const supabase = createClient(supabaseUrl, supabaseKey);

// INICIO
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/frontend/index.html");
});

// REGISTRO
app.post("/registro", async (req, res) => {
  console.log("Datos recibidos:", req.body);

  const { nombre, apellido, correo, password } = req.body;

  if (!nombre || !apellido || !correo || !password) {
    return res.status(400).json({
      mensaje: "Completa todos los campos"
    });
  }

  try {
    const { data, error } = await supabase
      .from("usuarios")
      .insert([
        {
          nombre_cli: nombre,
          apellido_cli: apellido,
          correo_cli: correo,
          password: password,
          celular_cli: null,
          ciudad_cli: "Lima",
          sexo_cli: "O"
        }
      ])
      .select();

    if (error) {
      console.log("❌ Error Supabase:", error);

      return res.status(500).json({
        mensaje: "Error al registrar usuario",
        error: error.message
      });
    }

    res.json({
      mensaje: "Usuario registrado correctamente",
      usuario: data[0]
    });

  } catch (err) {
    console.log("❌ Error inesperado:", err);

    res.status(500).json({
      mensaje: "Error inesperado en el servidor",
      error: err.message
    });
  }
});

// SERVER
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
