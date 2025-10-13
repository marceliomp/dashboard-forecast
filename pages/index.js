import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const BITRIX_WEBHOOK = 'https://alvo.bitrix24.com.br/rest/1/8notqwwad2r87739/';

export default function DashboardForecast() {
  const [user, setUser] = useState(null);
  const [deals, setDeals] = useState([]);
  const [allDeals, setAllDeals] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Filtros
  const [dateFilter, setDateFilter] = useState('all');
  const [dateType, setDateType] = useState('created'); // 'created' ou 'closed'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const colors = {
    primary: '#1a4d4d',
    secondary: '#2d6b5f',
    dark: '#0a0a0a',
    light: '#ffffff',
    gray: '#e5e7eb'
  };

  const stageMap = {
    'NEW': { name: 'Novo Lead', probability: 10, order: 1 },
    'PREPARATION': { name: 'Qualificação', probability: 25, order: 2 },
    'UC_1QZ0O9': { name: 'Em Análise', probability: 30, order: 3 },
    'UC_J1PXFX': { name: 'Em Negociação', probability: 50, order: 4 },
    'PREPAYMENT_INVOICE': { name: 'Proposta Enviada', probability: 60, order: 5 },
    'EXECUTING': { name: 'Contrato', probability: 80, order: 6 },
    'FINAL_INVOICE': { name: 'Fechamento', probability: 90, order: 7 },
    'WON': { name: 'Ganho', probability: 100, order: 8 },
    'LOSE': { name: 'Perdido', probability: 0, order: 9 }
  };

  const getStageInfo = (stageId) => {
    if (!stageId) return { name: 'Sem Etapa', probability: 0, order: 0 };
    const cleanStageId = stageId.replace(/^C\d+:/, '');
    return stageMap[cleanStageId] || { name: cleanStageId, probability: 30, order: 0 };
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`/api/bitrix?endpoint=user.get`);
      const data = await response.json();
      if (data.result) {
        setUsers(data.result);
      }
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    }
  };

  const fetchDeals = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/bitrix?endpoint=crm.deal.list`);
      const data = await response.json();
      
      if (data.result && data.result.length > 0) {
        // Filtrar apenas funil de Vendas (CATEGORY_ID = "0")
        const salesDeals = data.result.filter(deal => deal.CATEGORY_ID === "0");
        setAllDeals(salesDeals);
        applyDateFilter(salesDeals, dateFilter, dateType);
      }
    } catch (error) {
      console.error('Erro ao buscar deals:', error);
    }
    setLoading(false);
  };

  const applyDateFilter = (dealsData, filter, type) => {
    const now = new Date();
    let filteredDeals = dealsData;

    if (filter !== 'all' && filter !== 'custom') {
      const days = parseInt(filter);
      const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

      filteredDeals = dealsData.filter(deal => {
        const dateField = type === 'created' ? deal.DATE_CREATE : deal.CLOSEDATE;
        if (!dateField) return false;
        const dealDate = new Date(dateField);
        return dealDate >= startDate && dealDate <= now;
      });
    } else if (filter === 'custom' && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);

      filteredDeals = dealsData.filter(deal => {
        const dateField = type === 'created' ? deal.DATE_CREATE : deal.CLOSEDATE;
        if (!dateField) return false;
        const dealDate = new Date(dateField);
        return dealDate >= start && dealDate <= end;
      });
    }

    setDeals(filteredDeals);
  };

  useEffect(() => {
    if (allDeals.length > 0) {
      applyDateFilter(allDeals, dateFilter, dateType);
    }
  }, [dateFilter, da
