// src/middlewares/authClient.js
function authClient(req, res, next) {
    if (req.session && req.session.cliente) {
        // Se o cliente estiver logado, deixa passar
        return next();
    }
    // Senão, redireciona para o login do cliente
    res.redirect('/login');
}

export default authClient;