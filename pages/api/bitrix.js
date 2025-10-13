export default async function handler(req, res) {
  const { endpoint } = req.query;
  
  const BITRIX_WEBHOOK = 'https://alvo.bitrix24.com.br/rest/1/8notqwwad2r87739/';
  
  try {
    const response = await fetch(`${BITRIX_WEBHOOK}${endpoint}.json`);
    const data = await response.json();
    
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar dados do Bitrix24' });
  }
}
