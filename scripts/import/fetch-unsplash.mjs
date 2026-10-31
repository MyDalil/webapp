// Photos Unsplash (licence Unsplash : usage commercial gratuit) — candidats à choisir à la main.
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
const OUT = 'data/images-unsplash'
const C = {
  generaliste: ['1532938911079-1b06ac7ceec7', '1666887360388-93e684b6474a', '1638202993928-7267aad84c31', '1505751172876-fa1923c5c528'],
  pediatre: ['1632053002928-1919605ee6f7', '1758691463331-2ac00e6f676f', '1676313030076-4ac0b37050fd', '1632052999447-e542d08d4f7d'],
  gynecologue: ['1691933880096-4046bc9e2fa0', '1691935071222-c008a4ccc2ca', '1654931800911-7a9cfb3b7c17', '1770134846141-a7a11976145d'],
  dentiste: ['1704455306251-b4634215d98f', '1722586663860-a0a372da5c57', '1643916800611-1302e8d27c38', '1662837625421-5fd8ed6131a0'],
  ophtalmologue: ['1757386320806-e3f03c9f41e8', '1758656321519-02fb5f48dc7e', '1758206524001-56b1b1ec72cf', '1539036776273-021ec1d78bec'],
  kine: ['1649751361457-01d3a696c7e6', '1772122028843-9139d23af4fb', '1645005512968-0c1fe99f0093', '1768507423533-b87b62769758'],
  psychologue: ['1758273241086-f3585ef8c2f8', '1758273240631-59d44c8f5b66', '1637245048732-adf1a547835e', '1573497491208-6b1acb260507'],
  menage: ['1758273238415-01ec03d9ef27', '1646980241033-cd7abda2ee88', '1563453392212-326f5e854473', '1740657254989-42fe9c3b8cce'],
  bricolage: ['1426927308491-6380b6a9936f', '1530124566582-a618bc2615dc', '1599651971621-7c42aaa20cd2', '1671040690726-b78261eff126'],
  demenagement: ['1714647211902-bb711d643a17', '1766040923580-16ad32fae8b4', '1773625706534-4cfa0e74f229', '1730154838368-c37b1fdebcf6'],
  jardinage: ['1611843467160-25afb8df1074', '1622383563227-04401ab4e5ea', '1515150144380-bca9f1650ed9', '1621272156568-7306716648df'],
  enfants: ['1687946803051-51da173a9f55', '1633104319071-4fa6fa12a613', '1757704556607-8cd205e5ba10', '1572540998592-5f2827735619'],
  animaux: ['1530700131180-d43d9b8cc41f', '1760615303229-8b32553033a6', '1782218948504-2fe2efd680a7', '1599406580992-46ab5d96f296'],
  informatique: ['1788025487883-c59e1f8edcaa', '1550041473-d296a3a8a18a', '1515378791036-0648a3ef77b2', '1785947058973-43d5e9c64ef7'],
  aide: ['1773227055624-07b515ba87c5', '1543333995-a78aea2eee50', '1559234938-b60fff04894d', '1773234005378-ceebf3c877b9'],
  cours: ['1758687126375-e2c1683219e9', '1785780224428-1e71ec3a1199', '1454165804606-c3d57bc86b40', '1653276071161-379c70560951'],
  sport: ['1758875569399-99a7d80ace43', '1534258936925-c58bed479fcb', '1758875569256-f37c438cac65', '1526506118085-60ce8714f8c5'],
  coran: ['1587617425953-9075d28b8c46', '1542816417-0983c9c9ad53', '1609599006353-e629aaabfeae', '1580220810949-e7ddee6a4954'],
}
const manifest = {}
for (const [k, ids] of Object.entries(C)) {
  mkdirSync(path.join(OUT, k), { recursive: true })
  manifest[k] = []
  for (const [i, id] of ids.entries()) {
    const url = `https://images.unsplash.com/photo-${id}?w=1600&q=82&fm=jpg&fit=max`
    const res = await fetch(url)
    if (!res.ok) { console.log('échec', k, id, res.status); continue }
    writeFileSync(path.join(OUT, k, `${i + 1}.jpg`), Buffer.from(await res.arrayBuffer()))
    manifest[k].push({ name: `${i + 1}.jpg`, id, source: `https://unsplash.com/photos/${id}`, license: 'Licence Unsplash' })
  }
  console.log(k, manifest[k].length)
}
writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1))
