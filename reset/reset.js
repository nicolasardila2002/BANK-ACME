
import { recuperarContrasena } from "../registro/jsprincipal.js";

document.getElementById("reset-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email-reset").value;

    const resultado = await recuperarContrasena(email);

    document.getElementById("mensaje-reset").innerHTML = `<p class='${resultado.success ? "success-message" : "error-message"}'>${resultado.message}</p>`;
});