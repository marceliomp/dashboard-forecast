import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const BITRIX_WEBHOOK = 'https://alvo.bitrix24.com.br/rest/1/8notqwwad2r87739/';

export default function DashboardForecast() {
  const [user, setUser] = useState(null);
  const [deals, setDeals] = useState([]);
  const [allDeals, setAllDeals] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
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

  // MAPEAMENTO CORRETO DAS ETAPAS DO SEU BITRIX24
  const stageMap = {
    'NEW': { name: 'Hora do Ouro', probability: 5, order: 1, color: '#87CEEB' },
    'PREPARATION': { name: 'NoShow', probability: 3, order: 2, color: '#FF6B6B' },
    'UC_1QZ0O9': { name: 'Nutrição Ativa', probability: 15, order: 3, color: '#4ECDC4' },
    'UC_J1PXFX': { name: 'Reunião Prevista', probability: 25, order: 4, color: '#45B7D1' },
    'PREPAYMENT_INVOICE': { name: 'Show', probability: 40, order: 5, color: '#96CEB4' },
    'EXECUTING': { name: 'Follow-Up', probability: 50, order: 6, color: '#FFEAA7' },
    'C1:PREPARATION': { name: 'Em Negociação', probability: 60, order: 7, color: '#DDA15E' },
    'FINAL_INVOICE': { name: 'Proposta Formalizada', probability: 75, order: 8, color: '#BC6C25' },
    'WON': { name: 'Negócios Fechados', probability: 100, order: 9, color: '#28a745' },
    'C1:WON': { name: 'Negócios Fechados', probability: 100, order: 9, color: '#28a745' },
    'LOSE': { name: 'Negócios Perdido', probability: 0, order: 10, color: '#dc3545' }
  };

  const getStageInfo = (stageId) => {
    if (!stageId) return { name: 'Sem Etapa', probability: 0, order: 0, color: '#ccc' };
    const cleanStageId = stageId.replace(/^C\d+:/, '');
    
    // Checar se é do funil Cop (C1:)
    if (stageId.startsWith('C1:')) {
      if (stageId === 'C1:PREPARATION') return stageMap['C1:PREPARATION'];
      if (stageId === 'C1:WON') return stageMap['C1:WON'];
    }
    
    return stageMap[cleanStageId] || stageMap[stageId] || { name: stageId, probability: 30, order: 0, color: '#999' };
  };

  const getDaysStale = (deal) => {
    const lastActivity = deal.LAST_ACTIVITY_TIME || deal.DATE_MODIFY;
    if (!lastActivity) return 0;
    const now = new Date();
    const lastDate = new Date(lastActivity);
    return Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
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
  }, [dateFilter, dateType, customStartDate, customEndDate]);

  const handleLogin = async () => {
    if (!loginEmail) {
      alert('Digite seu email');
      return;
    }
    
    await fetchUsers();
    
    const adminEmails = ['admin@alvo.com', 'gerente@alvo.com'];
    const isUserAdmin = adminEmails.includes(loginEmail.toLowerCase());
    setIsAdmin(isUserAdmin);
    
    const foundUser = { 
      id: isUserAdmin ? 'admin' : '1', 
      name: isUserAdmin ? 'Administrador' : loginEmail.split('@')[0],
      email: loginEmail 
    };
    
    setUser(foundUser);
    await fetchDeals();
  };

  const handleLogout = () => {
    setUser(null);
    setDeals([]);
    setAllDeals([]);
    setLoginEmail('');
    setIsAdmin(false);
  };

  const calculateStats = () => {
    const activeDeals = deals.filter(d => d.STAGE_SEMANTIC_ID !== 'F' && d.STAGE_SEMANTIC_ID !== 'S');
    const totalDeals = deals.length;
    const totalValue = deals.reduce((sum, deal) => sum + parseFloat(deal.OPPORTUNITY || 0), 0);
    const wonDeals = deals.filter(d => d.STAGE_SEMANTIC_ID === 'S').length;
    const lostDeals = deals.filter(d => d.STAGE_SEMANTIC_ID === 'F').length;
    
    const weightedValue = deals.reduce((sum, deal) => {
      const value = parseFloat(deal.OPPORTUNITY || 0);
      const stageInfo = getStageInfo(deal.STAGE_ID);
      return sum + (value * stageInfo.probability / 100);
    }, 0);

    const conversionRate = totalDeals > 0 ? ((wonDeals / totalDeals) * 100).toFixed(1) : 0;
    
    return { totalDeals, totalValue, wonDeals, lostDeals, weightedValue, conversionRate, activeDeals: activeDeals.length };
  };

  const getPriorityActions = () => {
    const staleDeals = deals.filter(deal => {
      if (deal.STAGE_SEMANTIC_ID === 'S' || deal.STAGE_SEMANTIC_ID === 'F') return false;
      const days = getDaysStale(deal);
      return days > 7;
    }).sort((a, b) => getDaysStale(b) - getDaysStale(a));

    const hotDeals = deals.filter(deal => {
      if (deal.STAGE_SEMANTIC_ID === 'S' || deal.STAGE_SEMANTIC_ID === 'F') return false;
      const stageInfo = getStageInfo(deal.STAGE_ID);
      return stageInfo.probability >= 60;
    });

    const highValueStale = deals.filter(deal => {
      if (deal.STAGE_SEMANTIC_ID === 'S' || deal.STAGE_SEMANTIC_ID === 'F') return false;
      const value = parseFloat(deal.OPPORTUNITY || 0);
      const days = getDaysStale(deal);
      return value > 400000 && days > 3;
    });

    return { staleDeals, hotDeals, highValueStale };
  };

  // DEALS EM ANDAMENTO (todos os ativos)
  const getActiveDeals = () => {
    return deals.filter(d => d.STAGE_SEMANTIC_ID !== 'F' && d.STAGE_SEMANTIC_ID !== 'S')
      .sort((a, b) => parseFloat(b.OPPORTUNITY || 0) - parseFloat(a.OPPORTUNITY || 0));
  };

  // DEALS PERDIDOS (todos)
  const getLostDeals = () => {
    return deals.filter(d => d.STAGE_SEMANTIC_ID === 'F')
      .sort((a, b) => new Date(b.DATE_MODIFY) - new Date(a.DATE_MODIFY));
  };

  const getStagesByUser = () => {
    const userStages = {};
    
    deals.forEach(deal => {
      const userId = deal.ASSIGNED_BY_ID || 'Sem responsável';
      const userName = users.find(u => u.ID === userId)?.NAME || users.find(u => u.ID === userId)?.LAST_NAME || `Corretor ${userId}`;
      const stageInfo = getStageInfo(deal.STAGE_ID);
      
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
          probability: stageInfo.probability,
          order: stageInfo.order
        };
      }
      
      const dealValue = parseFloat(deal.OPPORTUNITY || 0);
      userStages[userId].stages[stageName].count += 1;
      userStages[userId].stages[stageName].value += dealValue;
      userStages[userId].total += dealValue;
      userStages[userId].weighted += dealValue * (stageInfo.probability / 100);
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

  const stats = calculateStats();
  const stagesByUser = getStagesByUser();
  const chartData = getChartData();
  const priorityActions = getPriorityActions();
  const funnelData = getConversionFunnel();
  const activeDeals = getActiveDeals();
  const lostDeals = getLostDeals();

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
            placeholder="Seu email"
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
          
          <button onClick={handleLogin} style={{
            width: '100%',
            padding: '12px',
            background: colors.primary,
            color: colors.light,
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}>
            Entrar
          </button>
          
          <p style={{ fontSize: '12px', color: '#999', marginTop: '20px', textAlign: 'center' }}>
            💡 Use admin@alvo.com para visão gerencial
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
            {isAdmin ? '👨‍💼 Visão Gerencial - Funil de Vendas' : `👤 ${user.name}`}
          </p>
        </div>
        <button onClick={handleLogout} style={{
          padding: '10px 20px',
          background: colors.primary,
          color: colors.light,
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}>
          Sair
        </button>
      </header>

      <div style={{ background: colors.light, borderBottom: `2px solid ${colors.gray}`, padding: '0 30px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          {[
            { id: 'overview', label: '📊 Visão Geral' },
            { id: 'actions', label: '⚡ Ações Prioritárias' },
            { id: 'performance', label: '🏆 Performance' },
            { id: 'active', label: '🔥 Deals em Andamento' },
            { id: 'lost', label: '❌ Deals Perdidos' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '15px 20px',
                background: activeTab === tab.id ? colors.primary : 'transparent',
                color: activeTab === tab.id ? colors.light : colors.dark,
                border: 'none',
                borderBottom: activeTab === tab.id ? `3px solid ${colors.secondary}` : 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '15px'
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
              <div>
                <label style={{ fontSize: '14px', color: '#666', marginBottom: '8px', display: 'block' }}>📅 Período:</label>
                <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} style={{
                  padding: '10px',
                  borderRadius: '6px',
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
                  borderRadius: '6px',
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
                      borderRadius: '6px',
                      border: '2px solid #ddd',
                      fontSize: '14px'
                    }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '14px', color: '#666', marginBottom: '8px', display: 'block' }}>Até:</label>
                    <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} style={{
                      padding: '10px',
                      borderRadius: '6px',
                      border: '2px solid #ddd',
                      fontSize: '14px'
                    }} />
                  </div>
                </>
              )}

              <div style={{ marginLeft: 'auto', fontSize: '14px', color: '#666' }}>
                <strong>{deals.length}</strong> de <strong>{allDeals.length}</strong> negócios
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
                <AlertCard title="🚨 Deals Parados (sem atividade há +7 dias)" count={priorityActions.staleDeals.length} color={colors.red}>
                  {priorityActions.staleDeals.slice(0, 10).map(deal => (
                    <DealRow key={deal.ID} deal={deal} users={users} daysStale={getDaysStale(deal)} type="stale" />
                  ))}
                </AlertCard>

                <AlertCard title="🔥 Deals Quentes (>60% probabilidade)" count={priorityActions.hotDeals.length} color={colors.yellow}>
                  {priorityActions.hotDeals.slice(0, 10).map(deal => (
                    <DealRow key={deal.ID} deal={deal} users={users} stageInfo={getStageInfo(deal.STAGE_ID)} type="hot" />
                  ))}
                </AlertCard>

                <AlertCard title="💎 Alto Valor Parados (>R$ 400k e +3 dias)" count={priorityActions.highValueStale.length} color={colors.primary}>
                  {priorityActions.highValueStale.slice(0, 10).map(deal => (
                    <DealRow key={deal.ID} deal={deal} users={users} daysStale={getDaysStale(deal)} type="highValue" />
                  ))}
                </AlertCard>
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

const AlertCard = ({ title, count, color, children }) => (
  <div style={{
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    borderLeft: `6px solid ${color}`
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
      <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0a0a0a', margin: 0 }}>{title}</h3>
      <span style={{
        background: color,
        color: 'white',
        padding: '8px 16px',
        borderRadius: '20px',
        fontWeight: 'bold',
        fontSize: '16px'
      }}>
        {count}
      </span>
    </div>
    {count === 0 ? (
      <p style={{ color: '#28a745', fontWeight: 'bold', fontSize: '16px', textAlign: 'center', padding: '20px' }}>
        ✅ Nenhuma ação necessária! Continue assim!
      </p>
    ) : (
      <div>{children}</div>
    )}
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
          👤 {userName} | 💰 R$ {value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
        </p>
      </div>
      <div style={{ textAlign: 'right' }}>
        {type === 'stale' && (
          <span style={{
            background: '#dc3545',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '12px',
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
            borderRadius: '12px',
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
            borderRadius: '12px',
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
          <span>📅 Modificado: {dateModified}</span>
          {!isLost && <span>⏱️ {daysStale} dias sem atividade</span>}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{
          background: isLost ? colors.red : stageInfo.color || colors.primary,
          color: 'white',
          padding: '8px 16px',
          borderRadius: '12px',
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
    borderRadius: '8px',
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
