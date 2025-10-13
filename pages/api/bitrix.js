export default async function handler(req, res) {
  const { endpoint } = req.query;
  
  const BITRIX_WEBHOOK = 'https://alvo.bitrix24.com.br/rest/1/8notqwwad2r87739/';
  
  try {
    let allResults = [];
    let start = 0;
    let hasMore = true;
    
    // Buscar todos os deals com paginação
    while (hasMore && start < 5000) { // Limite de segurança
      const url = `${BITRIX_WEBHOOK}${endpoint}.json?start=${start}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.result && data.result.length > 0) {
        allResults = allResults.concat(data.result);
        start += 50; // Bitrix retorna 50 por vez
        
        // Verificar se tem mais resultados
        hasMore = data.next !== undefined;
      } else {
        hasMore = false;
      }
    }
    
    res.status(200).json({ 
      result: allResults,
      total: allResults.length 
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar dados do Bitrix24' });
  }
}
