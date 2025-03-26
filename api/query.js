export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '����������' });
  }

  try {
    const { ip } = req.body;

    // IP ��ʽ��֤
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) {
      return res.status(400).json({ error: '��Ч��IP��ַ��ʽ' });
    }

    // ��鱣����ַ
    if (isReservedIP(ip)) {
      return res.status(400).json({ error: '��֧�ֲ�ѯ����IP������ַ' });
    }

    // ��ȡ����λ��
    const ipLocResponse = await fetch(`https://apimobile.meituan.com/locate/v2/ip/loc?rgeo=true&ip=${ip}`);
    if (!ipLocResponse.ok) {
      return res.status(502).json({ error: `����λ��API����ʧ��: ${ipLocResponse.status}` });
    }
    const ipLocData = await ipLocResponse.json();

    const lng = ipLocData.data?.lng;
    const lat = ipLocData.data?.lat;
    if (!lng || !lat) {
      return res.status(400).json({ error: '�޷���ȡ��γ����Ϣ' });
    }

    // ��ȡ��ϸ��ַ
    const detailResponse = await fetch(`https://apimobile.meituan.com/group/v1/city/latlng/${lat},${lng}?tag=0`);
    if (!detailResponse.ok) {
      return res.status(502).json({ error: `��ϸ��ַAPI����ʧ��: ${detailResponse.status}` });
    }
    const detailData = await detailResponse.json();

    // ���ؽ��
    const result = {
      ip,
      location: {
        country: ipLocData.data?.rgeo?.country || '',
        province: ipLocData.data?.rgeo?.province || '',
        city: ipLocData.data?.rgeo?.city || '',
        district: ipLocData.data?.rgeo?.district || '',
        detail: detailData.data?.detail || '',
        lat,
        lng
      }
    };

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

function isReservedIP(ip) {
  const octets = ip.split('.').map(Number);
  if (octets[0] === 10) return true;
  if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;
  if (octets[0] === 192 && octets[1] === 168) return true;
  if (octets[0] === 169 && octets[1] === 254) return true;
  if (octets[0] === 127) return true;
  if (octets[0] === 0) return true;
  return false;
}