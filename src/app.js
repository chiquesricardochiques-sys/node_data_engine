
// ✅ ADICIONE ESTAS LINHAS NO TOPO - ANTES DE TUDO!
import dotenv from 'dotenv';
dotenv.config();

// Adicione logs para verificar se carregou
console.log("📌 Variáveis ENV carregadas:");
console.log("   PORT:", process.env.PORT);
console.log("   API_KEYS:", process.env.API_KEYS);
console.log("   GO_API_URL:", process.env.GO_API_URL);


import express from "express";
import handlebars from "express-handlebars";
import path from "path";
import apiRoutes from "./routes/api/index.js";
import adminRoutes from "./routes/admin/index.js";
import routsImg from "./routes/api/routsImg.js";

import './helpers/handlebarsHelpers.js';  // Importando helpers
import session from "express-session";
import methodOverride from "method-override";

const app = express();

// Body parser
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method")); 

// Static
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "super_secret",
    resave: false,
    saveUninitialized: false,
  })
);


// Handlebars
const hbs = handlebars.create({
  defaultLayout: "main",
  layoutsDir: "src/views/layouts",  // Diretório de layouts
  partialsDir: "src/views/partials"  // Diretório de partials
});

// Registrar a engine do Handlebars
app.engine("handlebars", hbs.engine);
app.set("view engine", "handlebars");
app.set("views", "src/views");  // Diretório de views

// Rotas
app.use("/api", apiRoutes);
app.use("/admin", adminRoutes);
// ...
app.use("/img", routsImg);

// Erro padrão
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send("Erro interno");
});

export default app;
