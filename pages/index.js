import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function DashboardForecast() {
  const [user, setUser] = useState(null);
  const [deals, setDeals] = useState([]);
  const [allDeals, setAllDeals] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedUser, setSelectedUser] = useState('all');
  const [showAllActions, setShowAllActions] = useState(false);
  
  const [dateFilter, setDateFilter] = useState('all');
  const [dateType, setDateType] = useState('created');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const colors = {
    primary: '#1a4d4d',
    secondary: '#2d6b5f',
    dark: '#0a0a0a',
    light: '#ffffff',
    gray: '#e5e7eb',
    red: '#dc3545',
    yellow: '#ffc107',
    green: '#28a745'
  };

  const stageMap = {
    'UC_1QZ0O9': { name: 'Hora do Ouro', probability: 0, order: 1, color: '#b3e5fc' },
    'UC_JGHE6A': { name: 'NoShow', probability: 3, order: 2, color: '#ef9a9a' },
    'UC_J1PXFX': { name: 'Nutrição Ativa', probability: 15, order: 3, color: '#80deea' },
    'NEW': { name: 'Reunião Prevista', probability: 25, order: 4, color: '#42a5f5' },
    'PREPARATION': { name: 'Show', probability: 10, order: 5, color: '#1e88e5' },
    'UC_SI76GS': { name: 'Follow-Up', probability: 30, order: 6, color: '#ffeb3b' },
    'PREPAYMENT_INVOICE': { name: 'Em Negociação', probability: 45, order: 7, color: '#ab47bc' },
    'FINAL_INVOICE': { name: 'Proposta Formalizada / Reserva', probability: 75, order: 8, color: '#ffa726' },
    'WON': { name: 'Negócios Fechados', probability: 100, order: 9, color: '#7bd500' },
    'C1:WON': { name: 'Negócios Fechados', probability: 100, order: 9, color: '#7bd500' },
    'LOSE': { name: 'Negócios Perdido', probability: 0, order: 10, color: '#ff5752' },
    'UC_ZB34M4': { name: 'Cliente não aceito (sem perfil)', probability: 0, order: 11, color: '#ef3000' }
  };

const getStageInfo = (stageId) => {
    // Valor padrão para retornar em qualquer erro
    const defaultStage = { name: 'Etapa Desconhecida', probability: 30, order: 0, color: '#999' };
    
    if (!stageId) {
      return { name: 'Sem Etapa', probability: 0, order: 0, color: '#ccc' };
    }
    
    // Tenta processar stages com prefixo C1:
    if (stageId.startsWith('C1:')) {
      if (stageId === 'C1:PREPARATION') return stageMap['PREPARATION'] || defaultStage;
      if (stageId === 'C1:WON') return stageMap['WON'] || defaultStage;
      // Remove o prefixo e continua
      const cleanStageId = stageId.replace('C1:', '');
      return stageMap[cleanStageId] || defaultStage;
    }
    
    // Remove qualquer prefixo C<número>:
    const cleanStageId = stageId.replace(/^C\d+:/, '');
    
    // Tenta encontrar no mapa
    const found = stageMap[cleanStageId] || stageMap[stageId];
    
    // Sempre retorna um objeto válido
    return found || defaultStage;
  };

  const getDaysStale = (deal) => {
    const lastActivity = deal.LAST_ACTIVITY_TIME || deal.DATE_MODIFY;
    if (!lastActivity) return 0;
    const now = new Date();
    const lastDate = new Date(lastActivity);
    return Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
  };

  const fetchDeals = async () => {
    setLoading(true);
    try {
 const response = await fetch(`/api/bitrix?endpoint=crm.deal.list`);
      const data = await response.json();
      
      if (data.result && data.result.length > 0) {
        const salesDeals = data.result.filter(deal => deal.CATEGORY_ID === "0");
        setAllDeals(salesDeals);
        applyFilters(salesDeals);
      }
    } catch (error) {
      console.error('Erro ao buscar deals:', error);
    }
    setLoading(false);
  };

const applyFilters = (dealsData) => {
    let filtered = dealsData;

    // Filtro de usuário
    if (!isAdmin && user && user.id !== 'admin') {
      // Corretor normal: VÊ APENAS SEUS PRÓPRIOS DEALS
      filtered = filtered.filter(deal => deal.ASSIGNED_BY_ID === user.id);
    } else if (isAdmin && selectedUser !== 'all') {
      // Admin com filtro específico de corretor
      filtered = filtered.filter(deal => deal.ASSIGNED_BY_ID === selectedUser);
    }

    // Filtro de data
    const now = new Date();
    if (dateFilter !== 'all' && dateFilter !== 'custom') {
      const days = parseInt(dateFilter);
      const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

      filtered = filtered.filter(deal => {
        const dateField = dateType === 'created' ? deal.DATE_CREATE : deal.CLOSEDATE;
        if (!dateField) return false;
        const dealDate = new Date(dateField);
        return dealDate >= startDate && dealDate <= now;
      });
    } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);

      filtered = filtered.filter(deal => {
        const dateField = dateType === 'created' ? deal.DATE_CREATE : deal.CLOSEDATE;
        if (!dateField) return false;
        const dealDate = new Date(dateField);
        return dealDate >= start && dealDate <= end;
      });
    }

    setDeals(filtered);
  };

  useEffect(() => {
    if (allDeals.length > 0 && user) {
      applyFilters(allDeals);
    }
  }, [dateFilter, dateType, customStartDate, customEndDate, selectedUser, isAdmin, user, allDeals]);

  const handleLogin = async () => {
    if (!loginEmail) {
      alert('Digite seu email');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch(`/api/bitrix?endpoint=user.get`);
      const data = await response.json();
      
      if (!data.result) {
        alert('Erro ao conectar com o Bitrix24');
        setLoading(false);
        return;
      }
      
      setUsers(data.result);
      
      // Emails dos gestores (ALTERE AQUI COM OS EMAILS REAIS DOS GESTORES)
      const adminEmails = ['admin@alvo.com', 'gerente@alvo.com'];
      const isUserAdmin = adminEmails.includes(loginEmail.toLowerCase());
      
      if (isUserAdmin) {
        // Login como Admin
        setIsAdmin(true);
        const foundUser = { 
          id: 'admin', 
          name: 'Administrador',
          email: loginEmail 
        };
        setUser(foundUser);
        await fetchDeals();
        setLoading(false);
        return;
      }
      
      // Procurar corretor no Bitrix24
      const bitrixUser = data.result.find(u => 
        u.EMAIL && u.EMAIL.toLowerCase() === loginEmail.toLowerCase()
      );
      
      if (bitrixUser) {
        // Corretor encontrado
        setIsAdmin(false);
        const foundUser = { 
          id: bitrixUser.ID, 
          name: bitrixUser.NAME || bitrixUser.LAST_NAME || 'Corretor',
          email: loginEmail 
        };
        setUser(foundUser);
        await fetchDeals();
        setLoading(false);
      } else {
        // Email não encontrado
        setLoading(false);
        alert('❌ Email não encontrado no sistema.\n\nApenas corretores cadastrados ou gestores podem acessar.');
      }
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      setLoading(false);
      alert('Erro ao conectar. Tente novamente.');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setDeals([]);
    setAllDeals([]);
    setLoginEmail('');
    setIsAdmin(false);
    setSelectedUser('all');
  };

const calculateStats = () => {
    const activeDeals = deals.filter(d => d.STAGE_SEMANTIC_ID !== 'F' && d.STAGE_SEMANTIC_ID !== 'S');
    const totalDeals = deals.length;
    const totalValue = deals.reduce((sum, deal) => sum + parseFloat(deal.OPPORTUNITY || 0), 0);
    const wonDeals = deals.filter(d => d.STAGE_SEMANTIC_ID === 'S').length;
    const lostDeals = deals.filter(d => d.STAGE_SEMANTIC_ID === 'F').length;
    
    console.log('📊 STATS DEBUG:');
    console.log('Total deals:', totalDeals);
    console.log('Lost deals:', lostDeals);
    console.log('Lost deal IDs:', deals.filter(d => d.STAGE_SEMANTIC_ID === 'F').map(d => d.ID));
    
    const weightedValue = deals.reduce((sum, deal) => {
      const value = parseFloat(deal.OPPORTUNITY || 0);
      const stageInfo = getStageInfo(deal.STAGE_ID);
      const probability = stageInfo?.probability ?? 0;
      return sum + (value * probability / 100);
    }, 0);

    const conversionRate = totalDeals > 0 ? ((wonDeals / totalDeals) * 100).toFixed(1) : 0;
    
    return { totalDeals, totalValue, wonDeals, lostDeals, weightedValue, conversionRate, activeDeals: activeDeals.length };
  };

  const getPriorityActionsByUser = () => {
    const byUser = {};

    deals.forEach(deal => {
      if (deal.STAGE_SEMANTIC_ID === 'S' || deal.STAGE_SEMANTIC_ID === 'F') return;

      const userId = deal.ASSIGNED_BY_ID || 'Sem responsável';
      
      // Se não for admin, só processa deals do próprio usuário
      if (!isAdmin && user && user.id !== 'admin' && userId !== user.id) return;
      
      const userName = users.find(u => u.ID === userId)?.NAME || `Corretor ${userId}`;
      const daysStale = getDaysStale(deal);
      const stageInfo = getStageInfo(deal.STAGE_ID);
      const value = parseFloat(deal.OPPORTUNITY || 0);

      if (!byUser[userId]) {
        byUser[userId] = {
          name: userName,
          stale: [],
          hot: [],
          highValue: []
        };
      }

      if (daysStale > 7) byUser[userId].stale.push(deal);
      if (stageInfo.probability >= 60) byUser[userId].hot.push(deal);
      if (value > 400000 && daysStale > 3) byUser[userId].highValue.push(deal);
    });

    return Object.values(byUser).filter(u => u.stale.length > 0 || u.hot.length > 0 || u.highValue.length > 0);
  };

  const getActiveDeals = () => {
    return deals.filter(d => d.STAGE_SEMANTIC_ID !== 'F' && d.STAGE_SEMANTIC_ID !== 'S')
      .sort((a, b) => parseFloat(b.OPPORTUNITY || 0) - parseFloat(a.OPPORTUNITY || 0));
  };

  const getLostDeals = () => {
    return deals.filter(d => d.STAGE_SEMANTIC_ID === 'F')
      .sort((a, b) => new Date(b.DATE_MODIFY) - new Date(a.DATE_MODIFY));
  };

const getStagesByUser = () => {
    const userStages = {};
    
    deals.forEach(deal => {
      const userId = deal.ASSIGNED_BY_ID || 'Sem responsável';
      
      if (!isAdmin && user && user.id !== 'admin' && userId !== user.id) return;
      
      const userName = users.find(u => u.ID === userId)?.NAME || `Corretor ${userId}`;
      const stageInfo = getStageInfo(deal.STAGE_ID);
      
      // Proteção: se stageInfo vier null/undefined, pula esse deal
      if (!stageInfo || !stageInfo.name) return;
      
      if (!userStages[userId]) {
        userStages[userId] = {
          id: userId,
          name: userName,
          stages: {},
          total: 0,
          weighted: 0,
          count: 0,
          won: 0,
          lost: 0
        };
      }
      
      const stageName = stageInfo.name;
      if (!userStages[userId].stages[stageName]) {
        userStages[userId].stages[stageName] = {
          count: 0,
          value: 0,
          probability: stageInfo.probability || 0,
          order: stageInfo.order || 0
        };
      }
      
      const dealValue = parseFloat(deal.OPPORTUNITY || 0);
      userStages[userId].stages[stageName].count += 1;
      userStages[userId].stages[stageName].value += dealValue;
      userStages[userId].total += dealValue;
      userStages[userId].weighted += dealValue * ((stageInfo.probability || 0) / 100);
      userStages[userId].count += 1;

      if (deal.STAGE_SEMANTIC_ID === 'S') userStages[userId].won += 1;
      if (deal.STAGE_SEMANTIC_ID === 'F') userStages[userId].lost += 1;
    });
    
    return Object.values(userStages).sort((a, b) => b.weighted - a.weighted);
  };

  const getChartData = () => {
    const userStages = getStagesByUser();
    return userStages.slice(0, 10).map(user => ({
      name: user.name.split(' ')[0],
      total: user.total,
      weighted: user.weighted,
      count: user.count
    }));
  };

  const getConversionFunnel = () => {
    const funnel = {};
    deals.forEach(deal => {
      const stageInfo = getStageInfo(deal.STAGE_ID);
      if (!funnel[stageInfo.name]) {
        funnel[stageInfo.name] = { count: 0, order: stageInfo.order };
      }
      funnel[stageInfo.name].count += 1;
    });

    return Object.entries(funnel)
      .sort(([, a], [, b]) => a.order - b.order)
      .map(([name, data]) => ({ name, count: data.count }));
  };

 const stats = user ? calculateStats() : { totalDeals: 0, totalValue: 0, wonDeals: 0, lostDeals: 0, weightedValue: 0, conversionRate: 0, activeDeals: 0 };
  const stagesByUser = user ? getStagesByUser() : [];
  const chartData = user ? getChartData() : [];
  const priorityActionsByUser = user ? getPriorityActionsByUser() : [];
  const funnelData = user ? getConversionFunnel() : [];
  const activeDeals = user ? getActiveDeals() : [];
  const lostDeals = user ? getLostDeals() : [];

  if (!user) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: colors.light,
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          maxWidth: '400px',
          width: '100%'
        }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: colors.dark, marginBottom: '10px', textAlign: 'center' }}>
            Dashboard Forecast
          </h1>
          <p style={{ color: '#666', textAlign: 'center', marginBottom: '30px' }}>
            Sistema Inteligente de Vendas
          </p>
          
          <input
            type="email"
            placeholder="Seu email cadastrado no Bitrix24"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #ddd',
              borderRadius: '8px',
              fontSize: '16px',
              marginBottom: '20px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          
          <button onClick={handleLogin} disabled={loading} style={{
            width: '100%',
            padding: '12px',
            background: loading ? '#ccc' : colors.primary,
            color: colors.light,
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}>
            {loading ? 'Validando...' : 'Entrar'}
          </button>
          
          <p style={{ fontSize: '12px', color: '#999', marginTop: '20px', textAlign: 'center' }}>
            🔒 Apenas corretores cadastrados podem acessar
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <header style={{
        background: colors.dark,
        color: colors.light,
        padding: '20px 30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
            Dashboard Forecast - Alvo Imóveis
          </h1>
          <p style={{ fontSize: '14px', opacity: 0.7, margin: '5px 0 0 0' }}>
            {isAdmin ? '👨‍💼 Visão Gerencial' : `👤 ${user.name}`}
          </p>
        </div>
        <button onClick={handleLogout} style={{
          padding: '12px 24px',
          background: colors.primary,
          color: colors.light,
          border: 'none',
          borderRadius: '25px',
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: '14px'
        }}>
          Sair
        </button>
      </header>

      <div style={{ background: colors.light, borderBottom: `2px solid ${colors.gray}`, padding: '15px 30px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {[
            { id: 'overview', label: '📊 Visão Geral' },
            { id: 'actions', label: '⚡ Ações Prioritárias' },
            { id: 'performance', label: '🏆 Performance' },
            { id: 'active', label: '🔥 Em Andamento' },
            { id: 'lost', label: '❌ Perdidos' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 24px',
                background: activeTab === tab.id ? colors.primary : colors.gray,
                color: activeTab === tab.id ? colors.light : colors.dark,
                border: 'none',
                borderRadius: '25px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px',
                transition: 'all 0.3s',
                boxShadow: activeTab === tab.id ? '0 4px 8px rgba(0,0,0,0.2)' : 'none'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '30px', maxWidth: '1600px', margin: '0 auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <p style={{ fontSize: '18px', color: '#666' }}>Carregando dados...</p>
          </div>
        ) : (
          <>
            <div style={{
              background: colors.light,
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              marginBottom: '30px',
              display: 'flex',
              gap: '20px',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
              {isAdmin && (
                <div>
                  <label style={{ fontSize: '14px', color: '#666', marginBottom: '8px', display: 'block' }}>👤 Corretor:</label>
                  <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: '2px solid #ddd',
                    fontSize: '14px',
                    cursor: 'pointer',
                    minWidth: '200px'
                  }}>
                    <option value="all">Todos os corretores</option>
                    {users.map(u => (
                      <option key={u.ID} value={u.ID}>{u.NAME || u.LAST_NAME}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label style={{ fontSize: '14px', color: '#666', marginBottom: '8px', display: 'block' }}>📅 Período:</label>
                <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: '2px solid #ddd',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}>
                  <option value="all">Todos</option>
                  <option value="30">Últimos 30 dias</option>
                  <option value="90">Últimos 90 dias</option>
                  <option value="180">Últimos 6 meses</option>
                  <option value="365">Último ano</option>
                  <option value="custom">Customizado</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '14px', color: '#666', marginBottom: '8px', display: 'block' }}>📆 Tipo:</label>
                <select value={dateType} onChange={(e) => setDateType(e.target.value)} style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: '2px solid #ddd',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}>
                  <option value="created">Criação</option>
                  <option value="closed">Fechamento</option>
                </select>
              </div>

              {dateFilter === 'custom' && (
                <>
                  <div>
                    <label style={{ fontSize: '14px', color: '#666', marginBottom: '8px', display: 'block' }}>De:</label>
                    <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: '2px solid #ddd',
                      fontSize: '14px'
                    }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '14px', color: '#666', marginBottom: '8px', display: 'block' }}>Até:</label>
                    <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: '2px solid #ddd',
                      fontSize: '14px'
                    }} />
                  </div>
                </>
              )}

              <div style={{ marginLeft: 'auto', fontSize: '14px', color: '#666' }}>
                <strong>{deals.length}</strong> negócios
              </div>
            </div>

            {activeTab === 'overview' && (
              <>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '20px',
                  marginBottom: '30px'
                }}>
                  <StatCard title="Pipeline Total" value={`R$ ${stats.totalValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`} color={colors.secondary} icon="💰" />
                  <StatCard title="Weighted Pipeline" value={`R$ ${stats.weightedValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`} color={colors.primary} icon="⚖️" />
                  <StatCard title="Em Andamento" value={stats.activeDeals} color={colors.secondary} icon="🔥" />
                  <StatCard title="Fechados" value={stats.wonDeals} color={colors.green} icon="✅" />
                  <StatCard title="Perdidos" value={stats.lostDeals} color={colors.red} icon="❌" />
                  <StatCard title="Taxa Conversão" value={`${stats.conversionRate}%`} color={colors.primary} icon="📈" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                  <div style={{ background: colors.light, padding: '25px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ marginBottom: '20px', color: colors.dark }}>📈 Performance por Corretor</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`} />
                        <Legend />
                        <Bar dataKey="weighted" fill={colors.primary} name="Weighted" />
                        <Bar dataKey="total" fill={colors.secondary} name="Total" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div style={{ background: colors.light, padding: '25px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ marginBottom: '20px', color: colors.dark }}>🎯 Funil de Conversão</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={funnelData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={150} />
                        <Tooltip />
                        <Bar dataKey="count" fill={colors.secondary} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'actions' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                <div style={{ marginBottom: '20px', textAlign: 'right' }}>
                  <button
                    onClick={() => setShowAllActions(!showAllActions)}
                    style={{
                      padding: '12px 24px',
                      background: colors.primary,
                      color: colors.light,
                      border: 'none',
                      borderRadius: '25px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '14px'
                    }}
                  >
                    {showAllActions ? '📋 Ver Resumo' : '📊 Ver Todas as Ações'}
                  </button>
                </div>

                {priorityActionsByUser.map((userData, index) => (
                  <div key={index} style={{
                    background: colors.light,
                    padding: '25px',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    borderLeft: `6px solid ${colors.primary}`
                  }}>
                    <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: colors.dark, marginBottom: '20px' }}>
                      👤 {userData.name}
                    </h3>

                    <div style={{ display: 'grid', gap: '15px' }}>
                      {userData.stale.length > 0 && (
                        <div>
                          <h4 style={{ fontSize: '16px', color: colors.red, marginBottom: '10px' }}>
                            🚨 Parados ({userData.stale.length})
                          </h4>
                          {(showAllActions ? userData.stale : userData.stale.slice(0, 3)).map(deal => (
                            <DealRow key={deal.ID} deal={deal} users={users} daysStale={getDaysStale(deal)} type="stale" />
                          ))}
                        </div>
                      )}

                      {userData.hot.length > 0 && (
                        <div>
                          <h4 style={{ fontSize: '16px', color: colors.yellow, marginBottom: '10px' }}>
                            🔥 Quentes ({userData.hot.length})
                          </h4>
                          {(showAllActions ? userData.hot : userData.hot.slice(0, 3)).map(deal => (
                            <DealRow key={deal.ID} deal={deal} users={users} stageInfo={getStageInfo(deal.STAGE_ID)} type="hot" />
                          ))}
                        </div>
                      )}

                      {userData.highValue.length > 0 && (
                        <div>
                          <h4 style={{ fontSize: '16px', color: colors.primary, marginBottom: '10px' }}>
                            💎 Alto Valor ({userData.highValue.length})
                          </h4>
                          {(showAllActions ? userData.highValue : userData.highValue.slice(0, 3)).map(deal => (
                            <DealRow key={deal.ID} deal={deal} users={users} daysStale={getDaysStale(deal)} type="highValue" />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {priorityActionsByUser.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '50px', background: colors.light, borderRadius: '12px' }}>
                    <p style={{ fontSize: '18px', color: colors.green, fontWeight: 'bold' }}>
                      ✅ Nenhuma ação prioritária! Excelente trabalho!
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'performance' && (
              <div style={{ background: colors.light, padding: '25px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <h3 style={{ marginBottom: '20px', color: colors.dark }}>🎯 Ranking de Corretores</h3>
                
                {stagesByUser.map((userData, index) => (
                  <PerformanceCard key={userData.id} userData={userData} index={index} colors={colors} />
                ))}
              </div>
            )}

            {activeTab === 'active' && (
              <div style={{ background: colors.light, padding: '25px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <h3 style={{ marginBottom: '20px', color: colors.dark }}>
                  🔥 Deals em Andamento ({activeDeals.length} negócios)
                </h3>
                
                {activeDeals.map(deal => (
                  <DealDetailRow key={deal.ID} deal={deal} users={users} getStageInfo={getStageInfo} getDaysStale={getDaysStale} colors={colors} />
                ))}

                {activeDeals.length === 0 && (
                  <p style={{ textAlign: 'center', padding: '50px', color: '#666' }}>
                    Nenhum deal em andamento no período selecionado
                  </p>
                )}
              </div>
            )}

            {activeTab === 'lost' && (
              <div style={{ background: colors.light, padding: '25px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <h3 style={{ marginBottom: '20px', color: colors.dark }}>
                  ❌ Deals Perdidos ({lostDeals.length} negócios)
                </h3>
                
                {lostDeals.map(deal => (
                  <DealDetailRow key={deal.ID} deal={deal} users={users} getStageInfo={getStageInfo} getDaysStale={getDaysStale} colors={colors} isLost />
                ))}

                {lostDeals.length === 0 && (
                  <p style={{ textAlign: 'center', padding: '50px', color: '#666' }}>
                    Nenhum deal perdido no período selecionado
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const StatCard = ({ title, value, color, icon }) => (
  <div style={{
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    borderLeft: `4px solid ${color}`
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>{title}</p>
        <p style={{ fontSize: '24px', fontWeight: 'bold', color: color, margin: 0 }}>{value}</p>
      </div>
      <div style={{ fontSize: '36px' }}>{icon}</div>
    </div>
  </div>
);

const DealRow = ({ deal, users, daysStale, stageInfo, type }) => {
  const userName = users.find(u => u.ID === deal.ASSIGNED_BY_ID)?.NAME || 'Sem corretor';
  const value = parseFloat(deal.OPPORTUNITY || 0);

  return (
    <div style={{
      padding: '15px',
      marginBottom: '10px',
      background: '#f9f9f9',
      borderRadius: '8px',
      borderLeft: '4px solid #dc3545',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div style={{ flex: 1 }}>
        <h4 style={{ margin: '0 0 5px 0', fontSize: '16px', fontWeight: 'bold' }}>
          {deal.TITLE || 'Sem título'}
        </h4>
        <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
          💰 R$ {value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
        </p>
      </div>
      <div style={{ textAlign: 'right' }}>
        {type === 'stale' && (
          <span style={{
            background: '#dc3545',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 'bold'
          }}>
            🚨 {daysStale} dias parado
          </span>
        )}
        {type === 'hot' && stageInfo && (
          <span style={{
            background: '#ffc107',
            color: '#000',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 'bold'
          }}>
            🔥 {stageInfo.probability}% chance
          </span>
        )}
        {type === 'highValue' && (
          <span style={{
            background: '#1a4d4d',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 'bold'
          }}>
            💎 Alto valor - {daysStale} dias
          </span>
        )}
      </div>
    </div>
  );
};

const DealDetailRow = ({ deal, users, getStageInfo, getDaysStale, colors, isLost }) => {
  const userName = users.find(u => u.ID === deal.ASSIGNED_BY_ID)?.NAME || 'Sem corretor';
  const value = parseFloat(deal.OPPORTUNITY || 0);
  const stageInfo = getStageInfo(deal.STAGE_ID);
  const daysStale = getDaysStale(deal);
  const dateModified = new Date(deal.DATE_MODIFY).toLocaleDateString('pt-BR');

  return (
    <div style={{
      padding: '20px',
      marginBottom: '15px',
      background: '#f9f9f9',
      borderRadius: '8px',
      borderLeft: `4px solid ${isLost ? colors.red : stageInfo.color || colors.primary}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div style={{ flex: 1 }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 'bold', color: colors.dark }}>
          {deal.TITLE || 'Sem título'}
        </h4>
        <div style={{ display: 'flex', gap: '20px', fontSize: '14px', color: '#666' }}>
          <span>👤 {userName}</span>
          <span>💰 R$ {value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
          <span>📅 {dateModified}</span>
          {!isLost && <span>⏱️ {daysStale} dias sem atividade</span>}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{
          background: isLost ? colors.red : stageInfo.color || colors.primary,
          color: 'white',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: 'bold',
          marginBottom: '5px'
        }}>
          {stageInfo.name}
        </div>
        {!isLost && (
          <div style={{ fontSize: '13px', color: '#666' }}>
            {stageInfo.probability}% probabilidade
          </div>
        )}
      </div>
    </div>
  );
};

const PerformanceCard = ({ userData, index, colors }) => (
  <div style={{ 
    marginBottom: '30px',
    padding: '20px',
    background: index % 2 === 0 ? '#fafafa' : colors.light,
    borderRadius: '12px',
    border: `2px solid ${colors.gray}`
  }}>
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      marginBottom: '15px',
      paddingBottom: '15px',
      borderBottom: `2px solid ${colors.primary}`
    }}>
      <h4 style={{ fontSize: '20px', color: colors.dark, margin: 0, fontWeight: 'bold' }}>
        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '👤'} {userData.name} ({userData.count} negócios)
      </h4>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '14px', color: '#666' }}>Pipeline Total</div>
        <div style={{ fontSize: '20px', fontWeight: 'bold', color: colors.primary }}>
          R$ {userData.total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
        </div>
        <div style={{ fontSize: '14px', color: colors.secondary, fontWeight: 'bold', marginTop: '5px' }}>
          💰 Weighted: R$ {userData.weighted.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
        </div>
        <div style={{ fontSize: '14px', marginTop: '5px' }}>
          <span style={{ color: colors.green }}>✅ {userData.won}</span> | <span style={{ color: colors.red }}>❌ {userData.lost}</span>
        </div>
      </div>
    </div>

    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${colors.gray}`, background: '#f9f9f9' }}>
            <th style={{ padding: '12px', textAlign: 'left' }}>Etapa</th>
            <th style={{ padding: '12px', textAlign: 'center' }}>Prob.</th>
            <th style={{ padding: '12px', textAlign: 'center' }}>Qtd</th>
            <th style={{ padding: '12px', textAlign: 'right' }}>Valor Total</th>
            <th style={{ padding: '12px', textAlign: 'right' }}>Ponderado</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(userData.stages)
            .sort(([, a], [, b]) => a.order - b.order)
            .map(([stageName, stageData], idx) => (
              <tr key={idx} style={{ borderBottom: `1px solid ${colors.gray}` }}>
                <td style={{ padding: '12px' }}>{stageName}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    background: stageData.probability === 100 ? '#d4edda' : 
                               stageData.probability === 0 ? '#f8d7da' : 
                               stageData.probability >= 70 ? '#cce5ff' : 
                               stageData.probability >= 40 ? '#fff3cd' : '#e2e3e5',
                    color: stageData.probability === 100 ? '#155724' : 
                           stageData.probability === 0 ? '#721c24' : 
                           stageData.probability >= 70 ? '#004085' : 
                           stageData.probability >= 40 ? '#856404' : '#383d41'
                  }}>
                    {stageData.probability}%
                  </span>
                </td>
                <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', color: colors.primary }}>
                  {stageData.count}
                </td>
                <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>
                  R$ {stageData.value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                </td>
                <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: colors.secondary }}>
                  R$ {(stageData.value * stageData.probability / 100).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                </td>
              </tr>
            ))
          }
        </tbody>
      </table>
    </div>
  </div>
);
