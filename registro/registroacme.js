import { registrarUsuario } from "./jsprincipal.js";

const formulario = document.getElementById("registro-form");
const mensaje = document.getElementById("mensaje-registro");

formulario.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nombre = document.getElementById("nombre").value;
  const apellidos = document.getElementById("apellidos").value;
  const tipoId = document.getElementById("tipo-id").value;
  const numeroId = document.getElementById("numero-id").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirm-password").value;

  const telefono = document.getElementById("telefono").value;
  const direccion = document.getElementById("direccion").value;
  const genero = document.querySelector('input[name="genero"]:checked')?.value;
  const ciudad = document.getElementById("ciudad").value;

  // Validar contraseñas
  if (password !== confirmPassword) {
    mensaje.innerHTML = `<p class="error-message">Las contraseñas no coinciden.</p>`;
    return;
  }

  // Validar campos importantes
  if (!genero) {
    mensaje.innerHTML = `<p class="error-message">Selecciona un género.</p>`;
    return;
  }

  // Enviar datos al módulo de registro
  const resultado = await registrarUsuario(
    nombre,
    apellidos,
    tipoId,
    numeroId,
    email,
    password,
    telefono,
    direccion,
    genero
  );

  mensaje.innerHTML = `<p class='${resultado.success ? "success-message" : "error-message"}'>${resultado.message}</p>`;
});