// helpers/handlebarsHelpers.js
import Handlebars from 'handlebars';

// Helper para converter objetos para JSON
Handlebars.registerHelper('json', function(context) {
  return JSON.stringify(context, null, 2);
});

// Outros exemplos de helpers que você pode adicionar:

// Helper para formatar uma string em maiúsculas
Handlebars.registerHelper('uppercase', function(str) {
  return str.toUpperCase();
});

// Helper para verificar se um valor é igual
Handlebars.registerHelper('equals', function(val1, val2, options) {
  if (val1 === val2) {
    return options.fn(this);
  } else {
    return options.inverse(this);
  }
});

// Registra o helper eq
Handlebars.registerHelper('eq', function (a, b) {
  return a === b;
});


// Helper para calcular a soma de dois números
Handlebars.registerHelper('sum', function(a, b) {
  return a + b;
});

// Você pode adicionar mais helpers conforme necessário.
