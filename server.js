const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(cors());
app.use(express.json({ limit: "12mb" }));

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

function formatPrice(value) {
  return `S/ ${Number(value || 0).toFixed(2)}`;
}

function buildOrderEmailHtml(order, recipientType) {
  const customer = order.customer || {};
  const items = Array.isArray(order.items) ? order.items : [];
  const title = recipientType === "owner"
    ? "Nuevo pedido recibido en GOODISH"
    : "Tu pedido GOODISH fue creado";

  const itemsHtml = items.map(item => {
    const quantity = Number(item.quantity || 0);
    const price = Number(item.price || 0);
    const subtotal = quantity * price;

    return `
      <tr>
        <td style="padding:12px;border-bottom:1px solid #f1d7e6;">${item.name || "Producto GOODISH"}</td>
        <td style="padding:12px;border-bottom:1px solid #f1d7e6;text-align:center;">${quantity}</td>
        <td style="padding:12px;border-bottom:1px solid #f1d7e6;text-align:right;">${formatPrice(price)}</td>
        <td style="padding:12px;border-bottom:1px solid #f1d7e6;text-align:right;font-weight:700;">${formatPrice(subtotal)}</td>
      </tr>
    `;
  }).join("");

  return `
    <div style="font-family:Arial,sans-serif;background:#fff4fb;padding:28px;color:#251527;">
      <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #f4bfda;border-radius:18px;overflow:hidden;">
        <div style="background:#ef2f98;color:#fff;padding:22px 26px;">
          <h1 style="margin:0;font-size:26px;">GOODISH</h1>
          <p style="margin:6px 0 0;">${title}</p>
        </div>

        <div style="padding:26px;">
          <h2 style="margin:0 0 8px;">Pedido ${order.code || order.id}</h2>
          <p style="margin:0 0 22px;color:#766278;">Estado: ${order.paymentStatus || "PENDIENTE"} | Metodo: ${order.paymentMethod || "Por confirmar"}</p>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">
            <div style="border:1px solid #f1d7e6;border-radius:14px;padding:16px;">
              <strong>Cliente</strong>
              <p style="margin:8px 0 0;">${customer.name || "Cliente GOODISH"}</p>
              <p style="margin:4px 0 0;color:#766278;">${customer.email || "Correo no registrado"}</p>
              <p style="margin:4px 0 0;color:#766278;">${customer.phone || "Celular no registrado"}</p>
            </div>

            <div style="border:1px solid #f1d7e6;border-radius:14px;padding:16px;">
              <strong>Entrega</strong>
              <p style="margin:8px 0 0;">${customer.district || "Distrito no registrado"}</p>
              <p style="margin:4px 0 0;color:#766278;">${customer.address || "Direccion no registrada"}</p>
              <p style="margin:4px 0 0;color:#766278;">${customer.reference || "Sin referencia"}</p>
            </div>
          </div>

          <table style="width:100%;border-collapse:collapse;margin-bottom:22px;">
            <thead>
              <tr style="background:#251527;color:#fff;">
                <th style="padding:12px;text-align:left;">Producto</th>
                <th style="padding:12px;text-align:center;">Cant.</th>
                <th style="padding:12px;text-align:right;">Precio</th>
                <th style="padding:12px;text-align:right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml || `<tr><td colspan="4" style="padding:12px;">No hay productos registrados.</td></tr>`}
            </tbody>
          </table>

          <div style="text-align:right;font-size:22px;font-weight:800;color:#ef2f98;">
            Total: ${formatPrice(order.total || order.subtotal)}
          </div>

          <p style="margin:24px 0 0;color:#766278;">
            Se adjunta el PDF del pedido. Coordina el pago y entrega por los canales oficiales de GOODISH.
          </p>
        </div>
      </div>
    </div>
  `;
}

async function sendResendEmail({ to, subject, html, pdfBase64, filename }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM || "GOODISH <onboarding@resend.dev>";

  if (!apiKey) {
    throw new Error("Falta configurar RESEND_API_KEY en Render.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
      attachments: pdfBase64
        ? [
            {
              filename,
              content: pdfBase64
            }
          ]
        : []
    })
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || "Resend no pudo enviar el correo.");
  }

  return result;
}

app.post("/api/send-order-email", async (req, res) => {
  const { order, pdfBase64 } = req.body || {};
  const ownerEmail = process.env.BUSINESS_EMAIL || "goodish.peru@gmail.com";
  const customerEmail = order?.customer?.email;

  if (!order?.code) {
    return res.status(400).json({ ok: false, message: "Falta el pedido." });
  }

  if (!customerEmail) {
    return res.status(400).json({ ok: false, message: "Falta el correo del cliente." });
  }

  try {
    const filename = `${order.code}.pdf`;

    const [customerResult, ownerResult] = await Promise.all([
      sendResendEmail({
        to: customerEmail,
        subject: `Tu pedido GOODISH ${order.code}`,
        html: buildOrderEmailHtml(order, "customer"),
        pdfBase64,
        filename
      }),
      sendResendEmail({
        to: ownerEmail,
        subject: `Nuevo pedido GOODISH ${order.code}`,
        html: buildOrderEmailHtml(order, "owner"),
        pdfBase64,
        filename
      })
    ]);

    res.json({
      ok: true,
      message: "Correos enviados correctamente.",
      customerResult,
      ownerResult
    });
  } catch (error) {
    console.error("Error enviando correo:", error);

    res.status(500).json({
      ok: false,
      message: error.message || "No se pudo enviar el correo."
    });
  }
});

// SERVER
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
