const supabase = require('../config/supabase');
const { enqueueCampaign, cancelPendingMessages } = require('../services/dripService');

async function list(req, res, next) {
  try {
    const { data: campaigns, error } = await supabase
      .from('drip_campaigns')
      .select('*, steps:drip_steps(*)')
      .order('criado_em', { ascending: false });

    if (error) throw error;

    // Ordenar steps por step_order
    campaigns.forEach((c) => {
      if (c.steps) c.steps.sort((a, b) => a.step_order - b.step_order);
    });

    res.json({ campaigns });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const { data: campaign, error } = await supabase
      .from('drip_campaigns')
      .select('*, steps:drip_steps(*)')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!campaign) return res.status(404).json({ error: 'Campanha nao encontrada' });

    if (campaign.steps) campaign.steps.sort((a, b) => a.step_order - b.step_order);

    // Buscar stats da fila
    const [sentResult, pendingResult, failedResult] = await Promise.all([
      supabase.from('drip_queue').select('*', { count: 'exact', head: true }).eq('campaign_id', req.params.id).eq('status', 'sent'),
      supabase.from('drip_queue').select('*', { count: 'exact', head: true }).eq('campaign_id', req.params.id).eq('status', 'pending'),
      supabase.from('drip_queue').select('*', { count: 'exact', head: true }).eq('campaign_id', req.params.id).eq('status', 'failed'),
    ]);

    res.json({
      campaign,
      stats: {
        sent: sentResult.count || 0,
        pending: pendingResult.count || 0,
        failed: failedResult.count || 0,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { name, description, trigger_event, steps } = req.body;

    const { data: campaign, error } = await supabase
      .from('drip_campaigns')
      .insert({
        name,
        description: description || null,
        trigger_event: trigger_event || 'lead_created',
      })
      .select()
      .single();

    if (error) throw error;

    // Criar steps
    if (steps && steps.length > 0) {
      const stepsData = steps.map((s, i) => ({
        campaign_id: campaign.id,
        step_order: i + 1,
        delay_minutes: s.delay_minutes || 0,
        message_template: s.message_template,
      }));

      const { error: stepsError } = await supabase.from('drip_steps').insert(stepsData);
      if (stepsError) throw stepsError;
    }

    // Retornar campanha completa
    const { data: full } = await supabase
      .from('drip_campaigns')
      .select('*, steps:drip_steps(*)')
      .eq('id', campaign.id)
      .single();

    if (full?.steps) full.steps.sort((a, b) => a.step_order - b.step_order);

    res.status(201).json({ success: true, campaign: full });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { name, description, trigger_event, is_active, steps } = req.body;

    const { error } = await supabase
      .from('drip_campaigns')
      .update({ name, description, trigger_event, is_active })
      .eq('id', id);

    if (error) throw error;

    // Recriar steps se enviados
    if (steps) {
      await supabase.from('drip_steps').delete().eq('campaign_id', id);

      const stepsData = steps.map((s, i) => ({
        campaign_id: id,
        step_order: i + 1,
        delay_minutes: s.delay_minutes || 0,
        message_template: s.message_template,
      }));

      const { error: stepsError } = await supabase.from('drip_steps').insert(stepsData);
      if (stepsError) throw stepsError;
    }

    const { data: full } = await supabase
      .from('drip_campaigns')
      .select('*, steps:drip_steps(*)')
      .eq('id', id)
      .single();

    if (full?.steps) full.steps.sort((a, b) => a.step_order - b.step_order);

    res.json({ success: true, campaign: full });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const { error } = await supabase
      .from('drip_campaigns')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true, message: 'Campanha removida' });
  } catch (err) {
    next(err);
  }
}

async function stats(req, res, next) {
  try {
    const [campaigns, leads, sent, pending, failed] = await Promise.all([
      supabase.from('drip_campaigns').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('leads').select('*', { count: 'exact', head: true }),
      supabase.from('drip_queue').select('*', { count: 'exact', head: true }).eq('status', 'sent'),
      supabase.from('drip_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('drip_queue').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
    ]);

    res.json({
      activeCampaigns: campaigns.count || 0,
      totalLeads: leads.count || 0,
      totalSent: sent.count || 0,
      totalPending: pending.count || 0,
      totalFailed: failed.count || 0,
    });
  } catch (err) {
    next(err);
  }
}

async function enqueueManual(req, res, next) {
  try {
    const { lead_id, campaign_id } = req.body;

    const result = await enqueueCampaign(lead_id, campaign_id);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, enqueued: result.enqueued });
  } catch (err) {
    next(err);
  }
}

async function cancelLead(req, res, next) {
  try {
    const { lead_id } = req.params;
    await cancelPendingMessages(lead_id);
    res.json({ success: true, message: 'Mensagens drip pendentes canceladas' });
  } catch (err) {
    next(err);
  }
}

async function queueByLead(req, res, next) {
  try {
    const { lead_id } = req.params;

    const { data, error } = await supabase
      .from('drip_queue')
      .select('*, step:drip_steps(step_order, message_template), campaign:drip_campaigns(name)')
      .eq('lead_id', lead_id)
      .order('scheduled_at', { ascending: true });

    if (error) throw error;
    res.json({ messages: data || [] });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, create, update, remove, stats, enqueueManual, cancelLead, queueByLead };
