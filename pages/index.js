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
    const totalDeals = deals.length;
    const totalValue = deals.reduce((sum, deal) => {
      const value = parseFloat(deal.OPPORTUNITY || 0);
      return sum + value;
    }, 0);
    const wonDeals = deals.filter(d => {
      const stage = d.STAGE_ID?.replace(/^C\d+:/, '');
      return stage === 'WON' || d.STAGE_SEMANTIC_ID === 'S';
    }).length;
    const avgValue = totalDeals > 0 ? totalValue / totalDeals : 0;
    
    const weightedValue = deals.reduce((sum, deal) => {
      const value = parseFloat(deal.OPPORTUNITY || 0);
      const stageInfo = getStageInfo(deal.STAGE_ID);
      return sum + (value * stageInfo.probability / 100);
    }, 0);
    
    return { totalDeals, totalValue, wonDeals, avgValue, weightedValue };
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
          count: 0
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

  const stats = calculateStats();
  const stagesByUser = getStagesByUser();
  const chartData = getChartData();

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
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: 'bold', 
            color: colors.dark,
            marginBottom: '10px',
            textAlign: 'center'
          }}>
            Dashboard Forecast
          </h1>
          <p style={{ color: '#666', textAlign: 'center', marginBottom: '30px' }}>
            Sistema de acompanhamento de vendas
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
          
          <button
            onClick={handleLogin}
            style={{
              width: '100%',
              padding: '12px',
              background: colors.primary,
              color: colors.light,
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
          >
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
        <button
          onClick={handleLogout}
          style={{
            padding: '10px 20px',
            background: colors.primary,
            color: colors.light,
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Sair
        </button>
      </header>

      <div style={{ padding: '30px', maxWidth: '1600px', margin: '0 auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <p style={{ fontSize: '18px', color: '#666' }}>Carregando dados do Bitrix24...</p>
          </div>
        ) : (
          <>
            {/* Filtros de Data */}
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
                <label style={{ fontSize: '14px', color: '#666', marginBottom: '8px', display: 'block' }}>
                  📅 Período:
                </label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  style={{
                    padding: '10px',
                    borderRadius: '6px',
                    border: '2px solid #ddd',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all">Todos os períodos</option>
                  <option value="30">Últimos 30 dias</option>
                  <option value="90">Últimos 90 dias</option>
                  <option value="180">Últimos 6 meses</option>
                  <option value="365">Último ano</option>
                  <option value="custom">Período customizado</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '14px', color: '#666', marginBottom: '8px', display: 'block' }}>
                  📆 Tipo de data:
                </label>
                <select
                  value={dateType}
                  onChange={(e) => setDateType(e.target.value)}
                  style={{
                    padding: '10px',
                    borderRadius: '6px',
                    border: '2px solid #ddd',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="created">Data de Criação</option>
                  <option value="closed">Data de Fechamento</option>
                </select>
              </div>

              {dateFilter === 'custom' && (
                <>
                  <div>
                    <label style={{ fontSize: '14px', color: '#666', marginBottom: '8px', display: 'block' }}>
                      De:
                    </label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      style={{
                        padding: '10px',
                        borderRadius: '6px',
                        border: '2px solid #ddd',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '14px', color: '#666', marginBottom: '8px', display: 'block' }}>
                      Até:
                    </label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      style={{
                        padding: '10px',
                        borderRadius: '6px',
                        border: '2px solid #ddd',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </>
              )}

              <div style={{ marginLeft: 'auto', fontSize: '14px', color: '#666' }}>
                <strong>{deals.length}</strong> de <strong>{allDeals.length}</strong> negócios exibidos
              </div>
            </div>

            {/* Cards de Estatísticas */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px',
              marginBottom: '30px'
            }}>
              <StatCard 
                title="Total de Negócios" 
                value={stats.totalDeals} 
                color={colors.primary}
                icon="📊"
              />
              <StatCard 
                title="Pipeline Total" 
                value={`R$ ${stats.totalValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`}
                color={colors.secondary}
                icon="💰"
              />
              <StatCard 
                title="Weighted Pipeline" 
                value={`R$ ${stats.weightedValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`}
                color="#2d6b5f"
                icon="⚖️"
              />
              <StatCard 
                title="Negócios Ganhos" 
                value={stats.wonDeals}
                color="#1a4d4d"
                icon="✅"
              />
            </div>

            <div style={{
              background: colors.light,
              padding: '25px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              marginBottom: '30px'
            }}>
              <h3 style={{ marginBottom: '20px', color: colors.dark }}>
                📈 Performance por Corretor (Top 10)
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => `R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`}
                  />
                  <Legend />
                  <Bar dataKey="weighted" fill={colors.primary} name="Weighted Pipeline" />
                  <Bar dataKey="total" fill={colors.secondary} name="Pipeline Total" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{
              background: colors.light,
              padding: '25px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              marginBottom: '30px'
            }}>
              <h3 style={{ marginBottom: '20px', color: colors.dark }}>
                🎯 Pipeline Detalhado por Corretor e Etapa
              </h3>
              
              {stagesByUser.map((userData, index) => (
                <div key={userData.id} style={{ 
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
                    <h4 style={{ 
                      fontSize: '20px', 
                      color: colors.dark, 
                      margin: 0,
                      fontWeight: 'bold'
                    }}>
                      👤 {userData.name} ({userData.count} negócios)
                    </h4>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', color: '#666' }}>Pipeline Total</div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: colors.primary }}>
                        R$ {userData.total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                      </div>
                      <div style={{ fontSize: '14px', color: colors.secondary, fontWeight: 'bold', marginTop: '5px' }}>
                        💰 Weighted: R$ {userData.weighted.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                      </div>
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: `2px solid ${colors.gray}`, background: '#f9f9f9' }}>
                          <th style={{ padding: '12px', textAlign: 'left', color: colors.dark, fontSize: '14px' }}>Etapa</th>
                          <th style={{ padding: '12px', textAlign: 'center', color: colors.dark, fontSize: '14px' }}>Probabilidade</th>
                          <th style={{ padding: '12px', textAlign: 'center', color: colors.dark, fontSize: '14px' }}>Qtd</th>
                          <th style={{ padding: '12px', textAlign: 'right', color: colors.dark, fontSize: '14px' }}>Valor Total</th>
                          <th style={{ padding: '12px', textAlign: 'right', color: colors.dark, fontSize: '14px' }}>Valor Ponderado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(userData.stages)
                          .sort(([, a], [, b]) => a.order - b.order)
                          .map(([stageName, stageData], idx) => (
                            <tr key={idx} style={{ 
                              borderBottom: `1px solid ${colors.gray}`,
                              background: colors.light
                            }}>
                              <td style={{ padding: '12px', fontWeight: '500' }}>
                                {stageName}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                <span style={{
                                  padding: '6px 14px',
                                  borderRadius: '20px',
                                  fontSize: '13px',
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
                              <td style={{ 
                                padding: '12px', 
                                textAlign: 'center',
                                fontWeight: 'bold',
                                fontSize: '16px',
                                color: colors.primary
                              }}>
                                {stageData.count}
                              </td>
                              <td style={{ 
                                padding: '12px', 
                                textAlign: 'right',
                                fontWeight: 'bold',
                                color: colors.dark
                              }}>
                                R$ {stageData.value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                              </td>
                              <td style={{ 
                                padding: '12px', 
                                textAlign: 'right',
                                fontWeight: 'bold',
                                color: colors.secondary,
                                fontSize: '15px'
                              }}>
                                R$ {(stageData.value * stageData.probability / 100).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                              </td>
                            </tr>
                          ))
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
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
        <p style={{ fontSize: '28px', fontWeight: 'bold', color: color, margin: 0 }}>{value}</p>
      </div>
      <div style={{ fontSize: '40px' }}>{icon}</div>
    </div>
  </div>
);
