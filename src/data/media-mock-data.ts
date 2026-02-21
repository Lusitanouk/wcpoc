import type { MediaArticle, MediaCheckResult, MediaRiskLevel } from '@/types';

const publications = [
  'Reuters', 'Associated Press', 'BBC News', 'The Guardian', 'Al Jazeera',
  'Financial Times', 'Bloomberg', 'Wall Street Journal', 'Washington Post', 'The New York Times',
  'Miami Herald', 'Daily Mail Online', 'National Law Review', 'South China Morning Post', 'Der Spiegel',
];

const topics = [
  'Financial Crime', 'Money Laundering', 'Fraud', 'Corruption', 'Sanctions Evasion',
  'Terrorism Financing', 'Tax Evasion', 'Bribery', 'Cybercrime', 'Drug Trafficking',
  'Environmental Crime', 'Human Trafficking', 'Arms Dealing', 'Insider Trading', 'Theft and Embezzlement',
];

const sourceTypes = ['Newspaper', 'Newswire', 'Web Content', 'Blog', 'Magazine', 'Broadcast', 'Trade Journal'];

const countries = ['United States', 'United Kingdom', 'Russia', 'China', 'Germany', 'France', 'UAE', 'Brazil', 'India', 'Singapore'];

const riskLevels: MediaRiskLevel[] = ['High', 'Medium', 'Low', 'No Risk', 'Unknown'];

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randDate(start: string, end: string) {
  const s = new Date(start).getTime(), e = new Date(end).getTime();
  return new Date(s + Math.random() * (e - s)).toISOString().split('T')[0];
}

const headlineTemplates = [
  '{name} linked to suspected money laundering network in {country}',
  'Authorities investigate {name} for alleged sanctions evasion',
  '{name} named in {country} corruption probe',
  'Court documents reveal {name} connection to financial fraud scheme',
  '{name} faces regulatory scrutiny over {country} dealings',
  'Report: {name} associated with designated entity in {country}',
  '{name} denies involvement in {topic} allegations',
  'Federal investigation targets {name} for potential {topic}',
  '{country} authorities freeze assets linked to {name}',
  'New evidence emerges in {name} {topic} case',
  'EXCLUSIVE: {name} under scrutiny for {topic} in {country}',
  '{name} business ties to {country} raise compliance concerns',
  'Whistleblower report implicates {name} in {topic}',
  '{name} cooperating with {country} investigators on {topic} probe',
  'Breaking: {name} sanctioned by {country} over {topic} links',
];

const snippetTemplates = [
  'In a developing story, {name} has been identified in connection with {topic} activities spanning multiple jurisdictions. Sources familiar with the investigation say...',
  'Regulatory authorities in {country} have opened an inquiry into {name}\'s financial dealings, citing concerns over potential {topic}. The investigation was triggered by...',
  'Court filings reveal that {name} maintained business relationships with entities later designated for {topic}. According to the documents...',
  'A confidential report obtained by this publication details alleged links between {name} and {topic} operations in {country}. The report states...',
  '{name} has been named in a civil complaint filed in {country} alleging involvement in a {topic} scheme worth millions. Legal experts say...',
];

function generateHeadline(name: string): { headline: string; snippet: string; topic: string; country: string } {
  const topic = rand(topics);
  const country = rand(countries);
  const template = rand(headlineTemplates);
  const snippetTemplate = rand(snippetTemplates);
  return {
    headline: template.replace(/{name}/g, name).replace(/{country}/g, country).replace(/{topic}/g, topic.toLowerCase()),
    snippet: snippetTemplate.replace(/{name}/g, name).replace(/{country}/g, country).replace(/{topic}/g, topic.toLowerCase()),
    topic,
    country,
  };
}

export function generateMediaArticles(caseId: string, entityName: string, count: number): MediaArticle[] {
  return Array.from({ length: count }, (_, i) => {
    const { headline, snippet, topic, country } = generateHeadline(entityName);
    const additionalTopics = Array.from({ length: randInt(0, 2) }, () => rand(topics));
    const additionalCountries = Array.from({ length: randInt(0, 1) }, () => rand(countries));
    
    return {
      id: `${caseId}-media-${i + 1}`,
      caseId,
      headline,
      publication: rand(publications),
      publishedDate: randDate('2023-01-01', '2025-02-15'),
      wordCount: randInt(200, 3000),
      snippet,
      fullText: `${snippet}\n\nThe matter continues to develop as authorities in ${country} coordinate with international partners. Additional details are expected to emerge in the coming weeks as the investigation progresses.\n\nLegal representatives for ${entityName} have declined to comment on the ongoing proceedings, citing the sensitive nature of the matter. However, sources close to the situation suggest that the investigation may expand to include additional parties.\n\nCompliance experts note that this case highlights the importance of thorough due diligence procedures and ongoing monitoring of business relationships in high-risk jurisdictions.`,
      topics: [topic, ...additionalTopics].filter((v, i, a) => a.indexOf(v) === i),
      countries: [country, ...additionalCountries].filter((v, i, a) => a.indexOf(v) === i),
      matchedEntity: entityName,
      riskLevel: rand(riskLevels),
      riskReason: '',
      attached: Math.random() > 0.85,
      visited: Math.random() > 0.6,
      smartFilterRelevant: Math.random() > 0.3,
      highlightedTerms: [entityName, topic.toLowerCase(), rand(['arrested', 'convicted', 'alleged', 'suspected', 'sanctioned'])],
      sourceType: rand(sourceTypes),
    };
  });
}

export function generateMediaCheckResult(caseId: string, entityName: string): MediaCheckResult {
  const articleCount = randInt(20, 200);
  const articles = generateMediaArticles(caseId, entityName, Math.min(articleCount, 50));
  
  // Generate name variations as matched entities
  const nameParts = entityName.split(' ');
  const matchedEntities = [
    { name: entityName, count: randInt(Math.floor(articleCount * 0.5), articleCount) },
    { name: `${nameParts[nameParts.length - 1]}, ${nameParts[0]}`, count: randInt(5, 50) },
  ];
  if (nameParts.length > 1) {
    matchedEntities.push({ name: `${nameParts[0]} ${nameParts[nameParts.length - 1]} Jr.`, count: randInt(1, 10) });
  }

  return {
    caseId,
    entityName,
    totalArticles: articleCount,
    reviewRequired: randInt(Math.floor(articleCount * 0.3), articleCount),
    attachedCount: articles.filter(a => a.attached).length,
    matchedEntities,
    articles,
    smartFilterEnabled: true,
    dateRange: 'last2years',
  };
}
