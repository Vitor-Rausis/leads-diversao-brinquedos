const { z } = require('zod');

const leadSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  whatsapp: z.string().min(10, 'WhatsApp invalido').max(13, 'WhatsApp invalido'),
  origem: z.string().min(1, 'Origem obrigatoria'),
  observacoes: z.string().optional().nullable(),
  status: z.enum(['Novo', 'Em Contato', 'Respondeu', 'Convertido', 'Perdido']).optional(),
});

const leadUpdateSchema = z.object({
  nome: z.string().min(2).optional(),
  whatsapp: z.string().min(10).max(13).optional(),
  origem: z.string().min(1).optional(),
  observacoes: z.string().optional().nullable(),
  status: z.enum(['Novo', 'Em Contato', 'Respondeu', 'Convertido', 'Perdido']).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

const publicLeadSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  whatsapp: z.string().min(10, 'WhatsApp invalido').max(13, 'WhatsApp invalido'),
  origem: z.string().optional().default('Formulario do site'),
  observacoes: z.string().optional().nullable(),
});

const reportSchema = z.object({
  periodo_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD'),
  periodo_fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD'),
});

function validate(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      return res.status(400).json({
        error: 'Dados invalidos',
        details: err.errors,
      });
    }
  };
}

module.exports = {
  validate,
  leadSchema,
  leadUpdateSchema,
  loginSchema,
  publicLeadSchema,
  reportSchema,
};
