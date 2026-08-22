// ============================================================================
// ENV
// ============================================================================

import dotenv from 'dotenv';

dotenv.config();

console.log("📌 Variáveis ENV carregadas:");
console.log("   PORT:", process.env.PORT);
console.log("   API_KEYS:", process.env.API_KEYS);
console.log("   GO_API_URL:", process.env.GO_API_URL);


// ============================================================================
// IMPORTS
// ============================================================================

import express from "express";
import handlebars from "express-handlebars";
import path from "path";

import apiRoutes from "./routes/api/index.js";
import adminRoutes from "./routes/admin/index.js";
import mobileRoutes from "./routes/mobile/mobile.routes.js";
import routsImg from "./routes/api/routsImg.js";

import './helpers/handlebarsHelpers.js';

import session from "express-session";
import methodOverride from "method-override";

import { fileURLToPath } from "url";
import cors from 'cors';

// ============================================================================
// APP
// ============================================================================

const app = express();


// ============================================================================
// BODY PARSER
// ============================================================================

app.use(
    express.urlencoded({
        extended: true
    })
);
app.use(cors());

app.use(
    express.json()
);

app.use(
    methodOverride("_method")
);


// ============================================================================
// DIRETÓRIOS
// ============================================================================

const __filename =
    fileURLToPath(import.meta.url);

const __dirname =
    path.dirname(__filename);


// ============================================================================
// STATIC
// ============================================================================

app.use(
    express.static(
        path.join(
            __dirname,
            "public"
        )
    )
);


// ============================================================================
// SESSION
// ============================================================================

app.use(
    session({

        secret:
            process.env.SESSION_SECRET ||
            "super_secret",

        resave:
            false,

        saveUninitialized:
            false

    })
);


// ============================================================================
// HANDLEBARS
// ============================================================================

const hbs =
    handlebars.create({

        defaultLayout:
            "main",

        layoutsDir:
            "src/views/layouts",

        partialsDir:
            "src/views/partials"

    });


// ============================================================================
// ENGINE
// ============================================================================

app.engine(
    "handlebars",
    hbs.engine
);

app.set(
    "view engine",
    "handlebars"
);

app.set(
    "views",
    "src/views"
);


// ============================================================================
// ROTAS DO SITE
// ============================================================================

app.use(
    "/api",
    apiRoutes
);

app.use(
    "/admin",
    adminRoutes
);


// ============================================================================
// 📱 ROTAS DO MOBILE
// ============================================================================
//
// Todas as rotas definidas em:
//
// routes/mobile.routes.js
//
// ficarão disponíveis em:
//
// /api/mobile/...
//
// Exemplos:
//
// POST   /api/mobile/auth/register
// POST   /api/mobile/auth/login
// POST   /api/mobile/auth/forgot
// POST   /api/mobile/auth/reset
//
// GET    /api/mobile/auth/me
// GET    /api/mobile/home
// GET    /api/mobile/schedule
// GET    /api/mobile/horarios
//
// POST   /api/mobile/schedule
//
// GET    /api/mobile/my-schedules
//
// DELETE /api/mobile/schedule/:id
//
// GET    /api/mobile/profile
// PUT    /api/mobile/profile
//
// ============================================================================

app.use(
    "/api/mobile",
    mobileRoutes
);


// ============================================================================
// IMAGENS
// ============================================================================

app.use(
    "/img",
    routsImg
);


// ============================================================================
// ERRO PADRÃO
// ============================================================================

app.use(
    (err, req, res, next) => {

        console.error(
            "❌ Erro interno:",
            err
        );

        res
            .status(500)
            .send("Erro interno");
    }
);


// ============================================================================
// EXPORT
// ============================================================================

export default app;