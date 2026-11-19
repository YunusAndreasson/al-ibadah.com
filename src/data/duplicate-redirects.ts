/**
 * Articles that were published twice. Each copy (slug ending in `-2`) was removed and
 * its URL now 301s to the article that was kept (functions/_middleware.ts), as does its
 * Markdown twin. `id` is the removed copy's pre-migration `original_id`:
 * scripts/generate-legacy-redirects.ts sends `/index.php?article=<id>` to the kept article
 * too, so no old URL loses its target.
 *
 * Hand-maintained. The generator refuses to run if a `from` still exists as an article or
 * a `to` is not one.
 */
export const duplicateRedirects: ReadonlyArray<{ from: string; to: string; id: number }> = [
  {
    from: '/allmosa/blandat-om-allmosa/valgorenhet-sadaqat-och-allmosa-zakat-om-de-galler-2/',
    to: '/allmosa/blandat-om-allmosa/valgorenhet-sadaqat-och-allmosa-zakat-om-de-galler/',
    id: 1613,
  },
  {
    from: '/bon/att-vara-imam-och-bon-bakom-en-imam/bad-ensam-och-sedan-anslot-en-annan-person-2/',
    to: '/bon/att-vara-imam-och-bon-bakom-en-imam/bad-ensam-och-sedan-anslot-en-annan-person/',
    id: 1481,
  },
  {
    from: '/bon/att-vara-imam-och-bon-bakom-en-imam/leder-folket-i-en-bon-som-man-sjalv-redan-har-utfo-2/',
    to: '/bon/att-vara-imam-och-bon-bakom-en-imam/leder-folket-i-en-bon-som-man-sjalv-redan-har-utfo/',
    id: 1479,
  },
  {
    from: '/bon/mosken/be-tva-bonecykler-nar-man-kommer-in-i-mosken-2/',
    to: '/bon/mosken/be-tva-bonecykler-nar-man-kommer-in-i-mosken/',
    id: 1316,
  },
  {
    from: '/bon/overger-eller-missar-bonen/svarigheter-att-ga-upp-for-att-be-gryningsbonen-2/',
    to: '/bon/overger-eller-missar-bonen/svarigheter-att-ga-upp-for-att-be-gryningsbonen/',
    id: 1537,
  },
  {
    from: '/fasta/nar-ramadhan-borjar-och-slutar/hur-den-nya-manaden-bekraftas-2/',
    to: '/fasta/nar-ramadhan-borjar-och-slutar/hur-den-nya-manaden-bekraftas/',
    id: 1388,
  },
  {
    from: '/fasta/nar-ramadhan-borjar-och-slutar/visste-inte-att-manaden-hade-borjat-forran-efter-g-2/',
    to: '/fasta/nar-ramadhan-borjar-och-slutar/visste-inte-att-manaden-hade-borjat-forran-efter-g/',
    id: 1392,
  },
  {
    from: '/fasta/nattbon/tarawih-med-avsikten-att-be-nattbonen-isha-2/',
    to: '/fasta/nattbon/tarawih-med-avsikten-att-be-nattbonen-isha/',
    id: 1480,
  },
  {
    from: '/fasta/ta-igen-missad-fasta/skot-upp-att-ta-igen-fastegarna-till-nasta-ramadan-2/',
    to: '/fasta/ta-igen-missad-fasta/skot-upp-att-ta-igen-fastegarna-till-nasta-ramadan/',
    id: 1405,
  },
  {
    from: '/fasta/vad-som-bryter-eller-inte-bryter-fastan/tandkram-2/',
    to: '/fasta/vad-som-bryter-eller-inte-bryter-fastan/tandkram/',
    id: 1373,
  },
  {
    from: '/troslara/allahs-forutbestammelse/handlingar-om-de-begas-av-egen-fri-vilja-2/',
    to: '/troslara/allahs-forutbestammelse/handlingar-om-de-begas-av-egen-fri-vilja/',
    id: 1581,
  },
  {
    from: '/troslara/blandade-utlatanden/anledningen-till-att-profeten-varnade-folket-for-d-2/',
    to: '/troslara/blandade-utlatanden/anledningen-till-att-profeten-varnade-folket-for-d/',
    id: 1177,
  },
  {
    from: '/vallfard/blandade-utlatanden/den-svarta-stenens-ursprung-2/',
    to: '/vallfard/blandade-utlatanden/den-svarta-stenens-ursprung/',
    id: 1287,
  },
  {
    from: '/vallfard/forbjudna-saker-under-ihram/klippa-naglarna-under-ihram-2/',
    to: '/vallfard/forbjudna-saker-under-ihram/klippa-naglarna-under-ihram/',
    id: 1296,
  },
  {
    from: '/vallfard/ihram-och-avsikten-infor-vallfarden/bonen-forihramar-inte-ett-villkor-for-att-den-skal-2/',
    to: '/vallfard/ihram-och-avsikten-infor-vallfarden/bonen-forihramar-inte-ett-villkor-for-att-den-skal/',
    id: 757,
  },
  {
    from: '/vallfard/mojlighet-att-vallfarda/formagan-att-kunna-vallfarda-2/',
    to: '/vallfard/mojlighet-att-vallfarda/formagan-att-kunna-vallfarda/',
    id: 1323,
  },
  {
    from: '/vallfard/skulder/pilgrimsfarden-for-den-som-har-skulder-2/',
    to: '/vallfard/skulder/pilgrimsfarden-for-den-som-har-skulder/',
    id: 1304,
  },
  {
    from: '/vallfard/tawaf-och-sai/glomde-sai-2/',
    to: '/vallfard/tawaf-och-sai/glomde-sai/',
    id: 1293,
  },
  {
    from: '/vallfard/tawaf-och-sai/sai-utan-att-ha-tvagat-sig-2/',
    to: '/vallfard/tawaf-och-sai/sai-utan-att-ha-tvagat-sig/',
    id: 1278,
  },
  {
    from: '/vallfard/tawaf-och-sai/takbir-vid-slutet-av-tawaf-2/',
    to: '/vallfard/tawaf-och-sai/takbir-vid-slutet-av-tawaf/',
    id: 1294,
  },
]
