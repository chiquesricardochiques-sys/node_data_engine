/**
 * ====================================================
 * CONTROLLER DE DASHBOARD (ADMIN)
 * ====================================================
 */

import PROJECTS_SERVICE from "../../services/goProjects.service.js";
import goProjectsService from "../../services/goProjects.service.js"; // <--- importante

// =======================
// CONFIGURAÇÃO DE AUTENTICAÇÃO SIMPLES
// =======================
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "senha_super_secreta";

// Renderiza a tela de login
function loginPage(req, res) {
  res.render("admin/login");
}

// Processa login da dashboard
function login(req, res) {
  const { password } = req.body;

  if (password === ADMIN_PASSWORD) {
    req.session.adminAuthenticated = true;
    return res.redirect("/admin/dashboard");
  }

  return res.render("admin/login", { error: "Senha incorreta!" });
}

// Middleware para proteger rotas da dashboard
function authMiddleware(req, res, next) {
  if (req.session.adminAuthenticated) return next();
  return res.redirect("/admin/login");
}

// Renderiza a dashboard com links para projetos/templates
export async function dashboard(req, res) {
  try {
    const projects = await goProjectsService.listProjects(); // pega todos os projetos
    res.render("admin/dashboard", { projects });
  } catch (err) {
    console.error("Erro ao carregar dashboard:", err.message);
    res.render("admin/dashboard", { projects: [], error: "Erro ao carregar projetos" });
  }
}

// Logout
function logout(req, res) {
  req.session.adminAuthenticated = false;
  res.redirect("/admin/login");
}

// 👇 EXPORT ESM
export default {
  loginPage,
  login,
  authMiddleware,
  dashboard,
  logout,
};
