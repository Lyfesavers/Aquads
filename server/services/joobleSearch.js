const axios = require('axios');
const crypto = require('crypto');

/** Default aggregator (US-heavy index if location geo is ambiguous). */
const DEFAULT_JOOBLE_API_ROOT = 'https://jooble.org/api';

/**
 * Optional full API root including `/api`, e.g. `https://uk.jooble.org/api`.
 * Disables regional auto-routing when set.
 */
function manualJoobleApiRoot() {
  const raw = process.env.JOOBLE_API_ROOT || process.env.JOOBLE_API_BASE;
  if (!raw || typeof raw !== 'string') return null;
  const t = raw.trim().replace(/\/+$/, '');
  if (!/^https:\/\/[a-z0-9.-]+/i.test(t)) return null;
  return /\/api$/i.test(t) ? t : `${t}/api`;
}

/**
 * Jooble listings are partitioned by regional hosts (same key path as `/api/{key}`).
 * The root `jooble.org` searches often behave like US-centric radius queries; route
 * to the nearest regional API when we can infer a country from free-text location.
 */
function resolveJoobleApiRoot(locationRaw) {
  const manual = manualJoobleApiRoot();
  if (manual) return manual;

  const text = String(locationRaw || '').trim();
  const l = text.toLowerCase();

  const londonIsUsOrCa =
    /\blondon\s*,?\s*(oh(?:io)?|kentucky\b|\bky\b|ont(?:ario)?|\bon\b)\b/i.test(text);

  const rules = [
    {
      root: 'https://uk.jooble.org/api',
      ok: () => {
        if (/\blondon\b/i.test(text) && londonIsUsOrCa) return false;
        if (/\bscotland\s*,?\s*(pa|pennsylvania)\b/i.test(text)) return false;
        return (
          /\b(united kingdom|great britain|north(ern)? ireland|britain)\b/.test(l) ||
          /(^|[\s,(])u\.?k\.([\s),.]|$)/.test(text) ||
          /\b(england|scotland|wales)\b/.test(l) ||
          /\b(leeds|glasgow|manchester|liverpool|birmingham|sheffield|bristol|edinburgh|cardiff|belfast|newcastle|nottingham)\b/i.test(text) ||
          (/\blondon\b/i.test(text) && !londonIsUsOrCa)
        );
      },
    },
    {
      root: 'https://ie.jooble.org/api',
      ok: () =>
        /\b(ireland|éire)\b/i.test(text) ||
        (/\bdublin\b/i.test(text) &&
          !/\bdublin\s*,?\s*(oh(io)?|ca(lifornia)?)\b/i.test(text)),
    },
    {
      root: 'https://ca.jooble.org/api',
      ok: () =>
        /\bcanada\b/.test(l) ||
        /\b(ontario|quebec|alberta|british columbia|manitoba|saskatchewan|nova scotia|new brunswick|prince edward island|newfoundland)\b/i.test(l) ||
        /\b(toronto|vancouver|montreal|calgary|ottawa|edmonton|winnipeg|mississauga)(?:\s*,\s*canada)?\b/i.test(l) ||
        /\bvictoria\s*,?\s*(bc|british columbia)\b/i.test(text),
    },
    {
      root: 'https://au.jooble.org/api',
      ok: () => /\baustralia\b/.test(l) || /\boceania\b/i.test(l),
    },
    {
      root: 'https://nz.jooble.org/api',
      ok: () => /\b(new zealand|aotearoa)\b/i.test(l),
    },
    {
      root: 'https://de.jooble.org/api',
      ok: () =>
        /\bgermany\b|\bdeutschland\b|\bberlin\b|\bmunich\b|\bhamburg\b|\bfrankfurt\b|\bstuttgart\b|\bcologne\b|\bköln\b|\bkoeln\b|\bdüsseldorf\b|\bbonn\b|\bleipzig\b/i.test(
          text
        ),
    },
    {
      root: 'https://fr.jooble.org/api',
      ok: () => {
        if (/\bparis\s*,?\s*(tx|texas|kentucky\b|\bky\b|tn|tennessee|il|illinois|id|idaho|ar|arkansas)/i.test(text)) return false;
        return /\bfrance\b|\bparis\b|\blyon\b|\bmarseille\b|\btoulouse\b|\bbordeaux\b/i.test(text);
      },
    },
    {
      root: 'https://es.jooble.org/api',
      ok: () => /\b(spain|españa|espana)\b/i.test(l) || /\b(madrid|barcelona|valencia|seville|sevilla)\b/i.test(text),
    },
    {
      root: 'https://it.jooble.org/api',
      ok: () => {
        if (/\brome\s*,?\s*(ga|georgia)\b/i.test(text) && !/\bital(y|ia)\b/i.test(l)) return false;
        return /\bitaly\b|\bitalia\b|\brome\b|\broma\b|\bmilan[o]?\b|\bturin\b|\bnaples\b|\bnapoli\b/i.test(text);
      },
    },
    {
      root: 'https://nl.jooble.org/api',
      ok: () =>
        /\b(netherlands|holland)\b/i.test(text) ||
        /\b(amsterdam|rotterdam|utrecht)\b/i.test(text) ||
        /\b(the )?hague\b/i.test(text),
    },
    {
      root: 'https://za.jooble.org/api',
      ok: () =>
        /\bsouth africa\b/i.test(text) ||
        /\b(johannesburg|cape town|durban|pretoria)\b/i.test(text),
    },
    {
      root: 'https://ng.jooble.org/api',
      ok: () => /\bnigeria\b|\blagos\b|\babuja\b|\bport harcourt\b/i.test(text),
    },
    {
      root: 'https://ke.jooble.org/api',
      ok: () => /\bkenya\b|\bnairobi\b|\bmombasa\b/i.test(text),
    },
    {
      root: 'https://br.jooble.org/api',
      ok: () => /\b(brasil|brazil)\b|\b(são paulo|sao paulo|rio de janeiro|brasília|brasilia|belo horizonte)\b/i.test(text),
    },
    {
      root: 'https://mx.jooble.org/api',
      ok: () => /\bmexico\b|\bméxico\b/i.test(text) && !/\bnew mexico\b/i.test(text),
    },
    {
      root: 'https://in.jooble.org/api',
      ok: () =>
        /\bindia\b|\bbangalore\b|\bbengaluru\b|\bhyderabad\b|\bmumbai\b|\bdelhi\b|\bchennai\b|\bpune\b|\bkolkata\b|\bahmedabad\b/i.test(
          text
        ),
    },
    {
      root: 'https://sg.jooble.org/api',
      ok: () => /\bsingapore\b/i.test(text),
    },
    {
      root: 'https://jp.jooble.org/api',
      ok: () => /\bjapan\b|\btokyo\b|\bosaka\b|\bkyoto\b|\byokohama\b/i.test(text),
    },

    /*
     * Jooble publishes many `{cc}.jooble.org/api` fronts; we route by English geography hints.
     * This list is intentionally broad—not every Jooble site is enumerated; anything we do not
     * recognise still searches `DEFAULT_JOOBLE_API_ROOT`, and hosts that HTTP 403/404 fall back once.
     */
    {
      root: 'https://pl.jooble.org/api',
      ok: () =>
        /\bpoland\b|\bpolska\b|\bwarsaw\b|\bwarszawa\b|\bkrakow\b|\bcracow\b|\bwroclaw\b|\bpoznan\b|\bgdansk\b|\blódź\b|\blodz\b/i.test(text),
    },
    {
      root: 'https://pt.jooble.org/api',
      ok: () =>
        /\bportugal\b|\blisbon\b|\blisboa\b|\bporto\b|\bbraga\b|\b(coimbra|funchal)\b/i.test(text),
    },
    {
      root: 'https://cz.jooble.org/api',
      ok: () =>
        /\bczech(ia| republic)?\b|\bcechy\b|\bprague\b|\bpraha\b|\bbrno\b|\bostrava\b|\bplzen\b/i.test(text),
    },
    {
      root: 'https://sk.jooble.org/api',
      ok: () => /\bslovakia\b|\bbratislava\b|\bkošice\b|\bkosice\b/i.test(text),
    },
    {
      root: 'https://hu.jooble.org/api',
      ok: () =>
        /\bhungary\b|\bmagyarorszag\b|\bbudapest\b|\bdebrecen\b|\bmiskolc\b|\bpecs\b|\bgyőr\b/i.test(text),
    },
    {
      root: 'https://md.jooble.org/api',
      ok: () => /\bmoldova\b|\bchisinau\b|\bkishinev\b/i.test(text),
    },
    {
      root: 'https://ro.jooble.org/api',
      ok: () =>
        /\bromania\b|\bbucharest\b|\bbucuresti\b|\bcluj\b|\btimisoara\b|\biasi\b/i.test(text),
    },
    {
      root: 'https://se.jooble.org/api',
      ok: () =>
        /\bsweden\b|\bsverige\b|\bstockholm\b|\bgöteborg\b|\bgothenburg\b|\bmalmö\b|\bmalmo\b|\buppsala\b/i.test(
          text
        ),
    },
    {
      root: 'https://no.jooble.org/api',
      ok: () =>
        /\bnorway\b|\bnorge\b|\boslo\b|\bbergen\b|\btrondheim\b|\bstavanger\b/i.test(text),
    },
    {
      root: 'https://dk.jooble.org/api',
      ok: () =>
        /\bdenmark\b|\bdanmark\b|\bcopenhagen\b|\bkøbenhavn\b|\bkobenhavn\b|\baarhus\b|\bårhus\b/i.test(text),
    },
    {
      root: 'https://fi.jooble.org/api',
      ok: () =>
        /\bfinland\b|\bsuomi\b|\bhelsinki\b|\bespoo\b|\btampere\b|\bturku\b|\bvantaa\b/i.test(text),
    },
    {
      root: 'https://ch.jooble.org/api',
      ok: () => {
        if (/\bgeneva\s*,?\s*(il|illinois|ny|new york|oh|ohio)\b/i.test(text)) return false;
        return /\bswitzerland\b|\bsuisse\b|\bschweiz\b|\bzurich\b|\bzürich\b|\bgeneva\b|\bbasel\b|\blausanne\b|\bbern\b|\bgenf\b/i.test(
          text
        );
      },
    },
    {
      root: 'https://at.jooble.org/api',
      ok: () => {
        if (/\bvienna\s*,?\s*(va|wv|oh|texas|tx|usa)\b/i.test(text) && !/\baustria\b|\bösterreich\b/i.test(text))
          return false;
        return /\baustria\b|\bösterreich\b|\bwien\b|\bvienna\b|\bsalzburg\b|\binsbruck\b|\bgraz\b|\blinz\b/i.test(text);
      },
    },
    {
      root: 'https://be.jooble.org/api',
      ok: () =>
        /\bbelgium\b|\bbenelux\b|\bbrussels?\b|\bbruxelles\b|\bantwerp\b|\bghent\b|\bliège\b|\bliege\b|\b(leuven|charleroi|namur|mechelen)\b/i.test(
          text
        ),
    },
    {
      root: 'https://ua.jooble.org/api',
      ok: () =>
        /\bukraine\b|\bукраїн/i.test(text) ||
        /\b(kiev|kyiv|lviv|odessa|odesa|kharkiv|dnipro|donetsk|zaporizhzhya)\b/i.test(text),
    },
    {
      root: 'https://tr.jooble.org/api',
      ok: () =>
        /\bturkey\b|\btürkiye\b|\bistanbul\b|\bankara\b|\bizmir\b|\bantalya\b|\bbursa\b/i.test(text),
    },
    {
      root: 'https://gr.jooble.org/api',
      ok: () =>
        /\bgreece\b|\bellas\b|\bhellenic\b|\bathens\b|\bpatras\b|\bpatra\b|\bthessaloniki\b|\bsaloniki\b|\bheraklion\b|\bcrete\b/i.test(
          text
        ),
    },
    {
      root: 'https://hr.jooble.org/api',
      ok: () =>
        /\bcroatia\b|\bhrvatska\b|\bzagreb\b|\brijeka\b|\bosijek\b|\bzadar\b|\bsplit\b,?\s*croatia\b/i.test(text),
    },
    {
      root: 'https://bg.jooble.org/api',
      ok: () =>
        /\bbulgaria\b|\bsofia\b|\bplovdiv\b|\bvarna\b|\bburgas\b|\bruse\b(?!\w)/i.test(text),
    },
    {
      root: 'https://kr.jooble.org/api',
      ok: () =>
        /\bsouth korea\b|\brepublic of korea\b|\bseoul\b|\bbusan\b|\bincheon\b|\bdaegu\b|\bdaejeon\b|\bwonju\b|\bsuwon\b/i.test(
          text
        ),
    },
    {
      root: 'https://tw.jooble.org/api',
      ok: () => /\btaiwan\b|\btaipei\b|\btaichung\b|\bkaohsiung\b|\bhsinchu\b/i.test(text),
    },
    {
      root: 'https://hk.jooble.org/api',
      ok: () => /\bhong kong\b|\bhongkong\b|\bhk,? china\b/i.test(text),
    },
    {
      root: 'https://my.jooble.org/api',
      ok: () => /\bmalaysia\b|\bkuala lumpur\b|\bjohor\b|\bpenang\b|\bipoh\b/i.test(text),
    },
    {
      root: 'https://ph.jooble.org/api',
      ok: () => /\bphilippines\b|\bmanila\b|\bcebu\b|\bdavao\b|\bquezon city\b|\bmakati\b/i.test(text),
    },
    {
      root: 'https://th.jooble.org/api',
      ok: () => /\bthailand\b|\bbangkok\b|\bchiang mai\b|\bphuket\b|\bpattaya\b/i.test(text),
    },
    {
      root: 'https://vn.jooble.org/api',
      ok: () => /\bvietnam\b|\bviet nam\b|\bhanoi\b|\bho chi minh\b|\bsaigon\b|\bda nang\b/i.test(text),
    },
    {
      root: 'https://id.jooble.org/api',
      ok: () => /\bindonesia\b|\bjakarta\b|\bsurabaya\b|\bbandung\b|\bmedan\b|\bsemarang\b/i.test(text),
    },
    {
      root: 'https://sa.jooble.org/api',
      ok: () => /\bsaudi arabia\b|\briyadh\b|\bjeddah\b|\bdammam\b|\bmecca\b|\bmedina\b/i.test(text),
    },
    {
      root: 'https://ae.jooble.org/api',
      ok: () =>
        /\b(united arab emirates|\bu\.?\s*a\.?\s*e\.?|\bdubai\b|\babu dhabi\b|\bsharjah\b|\baijman\b|\bfujairah\b)/i.test(
          text
        ),
    },
    {
      root: 'https://il.jooble.org/api',
      ok: () => /\bisrael\b|\bjerusalem\b|\btel aviv\b|\bbeersheva\b|\bhaifa\b/i.test(text),
    },
    {
      root: 'https://pk.jooble.org/api',
      ok: () => /\bpakistan\b|\bkarachi\b|\blahore\b|\bislamabad\b|\brawalpindi\b|\bfaisalabad\b/i.test(text),
    },
    {
      root: 'https://eg.jooble.org/api',
      ok: () => /\begypt\b|\bcairo\b|\balexandria\b|\bgiza\b(?!\w)/i.test(text),
    }, // naive: “Giza IL” uncommon
    /** Africa beyond NG / KE / ZA (those rules appear earlier); use country names or clear cities. */
    {
      root: 'https://ma.jooble.org/api',
      ok: () =>
        /\bmorocco\b|\bmaroc\b|\bcasablanca\b|\brabat\b|\bmarrakesh\b|\bmarrakech(es|sh)?\b|\bagadir\b|\b(?:fez|fès)\b|\btanger\b|\btangiers?\b|\btangier\b|\bmeknes\b|\boujda\b/i.test(
          text
        ),
    },
    {
      root: 'https://dz.jooble.org/api',
      ok: () => /\balgeria\b|\balgiers\b/i.test(text),
    },
    {
      root: 'https://tn.jooble.org/api',
      ok: () => /\btunisia\b|\btunis\b|\bsfax\b|\bsousse\b|\bbizerte\b/i.test(text),
    },
    {
      root: 'https://gh.jooble.org/api',
      ok: () => /\bghana\b|\baccra\b|\bkumasi\b/i.test(text),
    },
    {
      root: 'https://et.jooble.org/api',
      ok: () => /\bethiopia\b|\baddis ababa\b/i.test(text),
    },
    {
      root: 'https://tz.jooble.org/api',
      ok: () => /\btanzania\b|\bzanzibar\b|\bdar\s+es\s+salaam\b|\bdodoma\b/i.test(text),
    },
    {
      root: 'https://ug.jooble.org/api',
      ok: () => /\buganda\b|\bkampala\b/i.test(text),
    },
    {
      root: 'https://sn.jooble.org/api',
      ok: () => /\bsenegal\b|\bdakar\b/i.test(text),
    },
    {
      root: 'https://ci.jooble.org/api',
      ok: () =>
        /\b(ivory coast|côte\s*d[''\u2019]\s*ivoire|cote\s*d['']?\s*ivoire)\b|\babidjan\b|\byamoussoukro\b/i.test(
          text
        ),
    },
    {
      root: 'https://cm.jooble.org/api',
      ok: () => /\bcameroon\b|\byaound[ée]\b|\bdouala\b/i.test(text),
    },
    {
      root: 'https://ao.jooble.org/api',
      ok: () => /\bangola\b|\bluanda\b/i.test(text),
    },
    {
      root: 'https://mz.jooble.org/api',
      ok: () => /\bmozambique\b|\bmaputo\b/i.test(text),
    },
    {
      root: 'https://zm.jooble.org/api',
      ok: () => /\bzambia\b|\blusaka\b/i.test(text),
    },
    {
      root: 'https://zw.jooble.org/api',
      ok: () => /\bzimbabwe\b|\bharare\b|\bbulawayo\b/i.test(text),
    },
    {
      root: 'https://rw.jooble.org/api',
      ok: () => /\brwanda\b|\bkigali\b/i.test(text),
    },
    {
      root: 'https://ly.jooble.org/api',
      ok: () => /\blibya\b|\bbenghazi\b/i.test(text),
    },
    {
      root: 'https://bw.jooble.org/api',
      ok: () => /\bbotswana\b|\bgaborone\b/i.test(text),
    },
    {
      root: 'https://na.jooble.org/api',
      ok: () => /\bnamibia\b|\bwindhoek\b|\bwalvis bay\b/i.test(text),
    },
    {
      root: 'https://mw.jooble.org/api',
      ok: () => /\bmalawi\b|\blilongwe\b/i.test(text),
    },
    {
      root: 'https://kw.jooble.org/api',
      ok: () => /\bkuwait\b|\bkuwait city\b/i.test(text),
    },
    {
      root: 'https://qa.jooble.org/api',
      ok: () => /\bqatar\b|\bdoha\b/i.test(text),
    },
    {
      root: 'https://bh.jooble.org/api',
      ok: () => /\bbahrain\b|\bmanama\b/i.test(text),
    },
    {
      root: 'https://lt.jooble.org/api',
      ok: () => /\blithuania\b|\bvilnius\b|\bkaunas\b|\bklaipeda\b/i.test(text),
    },
    {
      root: 'https://lv.jooble.org/api',
      ok: () => /\blatvia\b|\briga\b|\bdaugavpils\b/i.test(text),
    },
    {
      root: 'https://ee.jooble.org/api',
      ok: () => /\bestonia\b|\btallinn\b|\btartu\b/i.test(text),
    },
    {
      root: 'https://si.jooble.org/api',
      ok: () => /\bslovenia\b|\bljubljana\b|\bmaribor\b/i.test(text),
    },
    {
      root: 'https://ar.jooble.org/api',
      ok: () => /\bargentina\b|\bbuenos aires\b|\bcordoba\b,?\s*arg|\bmendoza\b,?\s*arg|\brosario\b,?\s*arg/i.test(text),
    },
    {
      root: 'https://co.jooble.org/api',
      ok: () =>
        /\bcolombia\b|\bbogota\b|\bbogotá\b|\bmedell(?:i|í)n\b|\bcali\b,?\s*col|\bcartagena\b,?\s*col/i.test(text),
    },
    {
      root: 'https://cl.jooble.org/api',
      ok: () =>
        /\bchile\b|\bsantiago\b,?\s*chile\b|\bsantiago\b,?\s*cl\b|\bvalpara(?:í|i)so\b|\bconcepción\b|\bconcepcion\b/i.test(
          text
        ),
    },
  ];

  for (const r of rules) {
    try {
      if (r.ok()) return r.root;
    } catch {
      /* skip bad predicate */
    }
  }
  return DEFAULT_JOOBLE_API_ROOT;
}

function getUserAgent() {
  return process.env.NODE_ENV === 'production'
    ? 'Aquads Job Board (+https://www.aquads.xyz)'
    : 'Aquads Jobs Dev';
}

function inferWorkArrangement(locationStr, snippetStr) {
  const text = `${locationStr || ''} ${snippetStr || ''}`.toLowerCase();
  if (/\bhybrid\b/.test(text)) return 'hybrid';
  if (/\bon-?site\b|\bin[\s-]office\b|\bon[\s]premises\b/i.test(text)) return 'onsite';
  return 'remote';
}

/**
 * Maps Jooble location string → { city, country } for Aquads badges.
 */
function splitJoobleLocation(locationStr) {
  const raw = String(locationStr || '').trim();
  if (!raw) return { city: '', country: '' };
  if (/\b(remote|worldwide|anywhere|global)\b/i.test(raw)) {
    return { city: '', country: 'Remote' };
  }
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { city: parts[0], country: parts[parts.length - 1] };
  }
  return { city: '', country: raw };
}

function stripSnippetHtml(snippet) {
  if (!snippet || typeof snippet !== 'string') return '';
  return snippet
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize one Jooble job row → public job list shape (not persisted).
 * Intentionally omits companyLogo so UI uses syndicated company-name avatar.
 */
function mapJoobleJobToListing(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = raw.id != null ? String(raw.id).trim() : '';
  const link =
    typeof raw.link === 'string' && /^https?:\/\//i.test(raw.link.trim()) ? raw.link.trim() : '';
  if (!link) return null;

  const company = String(raw.company || 'Company').trim() || 'Company';
  const snippet = stripSnippetHtml(raw.snippet || '');
  const salaryStr = typeof raw.salary === 'string' ? raw.salary.trim() : '';
  const title = String(raw.title || 'Job posting').trim() || 'Job posting';
  const locParts = splitJoobleLocation(raw.location || '');
  const workArrangement = inferWorkArrangement(raw.location, raw.snippet);

  let description = snippet || 'Search result from Jooble. Open the posting for full details.';
  if (salaryStr) {
    description = `💰 ${salaryStr}\n\n${description}`;
  }

  const externalKey = id || crypto.createHash('sha256').update(link).digest('hex').slice(0, 24);

  let createdAt = new Date();
  if (raw.updated) {
    const d = new Date(raw.updated);
    if (!Number.isNaN(d.getTime())) createdAt = d;
  }

  return {
    _id: `jooble:${externalKey}`,
    title,
    description,
    requirements: 'See job description for requirements',
    payAmount: null,
    payType: null,
    jobType: 'hiring',
    workArrangement,
    location: {
      country: locParts.country || (workArrangement === 'remote' ? 'Remote' : ''),
      city: locParts.city || '',
    },
    ownerUsername: company,
    ownerImage: null,
    companyLogo: null,
    status: 'active',
    source: 'jooble',
    externalUrl: link,
    externalId: id || externalKey,
    createdAt,
    owner: null,
  };
}

/**
 * Live search only — not stored in Mongo. Key must stay server-side.
 *
 * @param {object} opts
 * @param {string} opts.keywords – search query
 * @param {number} [opts.page]
 * @param {boolean} [opts.companysearch]
 * @returns {Promise<{ jobs: object[], totalCount: number, error?: string }>}
 */
async function searchJoobleRemoteJobs(opts) {
  const apiKey = (process.env.JOOBLE_API_KEY || '').trim();
  if (!apiKey) {
    return { jobs: [], totalCount: 0, error: 'no_key' };
  }

  const keywords = String(opts.keywords || '').trim();
  if (!keywords) {
    return { jobs: [], totalCount: 0 };
  }

  const locationForApi = opts.location != null ? String(opts.location).trim() : '';
  if (!locationForApi) {
    return { jobs: [], totalCount: 0, error: 'missing_location' };
  }

  const page = Math.max(1, parseInt(String(opts.page || '1'), 10) || 1);
  const companysearch =
    opts.companysearch === true || opts.companysearch === 'true' || opts.companysearch === '1';

  const apiRoot = resolveJoobleApiRoot(locationForApi);
  if (process.env.JOOBLE_DEBUG === '1') {
    console.info('[Jooble Search] api root', apiRoot, 'location=', locationForApi.slice(0, 100));
  }

  const body = {
    keywords: keywords.slice(0, 480),
    location: locationForApi.slice(0, 120),
    radius: process.env.JOOBLE_RADIUS != null ? String(process.env.JOOBLE_RADIUS) : '80',
    page: String(page),
    companysearch: companysearch ? 'true' : 'false',
  };

  try {
    const postOnce = (root) =>
      axios.post(`${root}/${encodeURIComponent(apiKey)}`, body, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': getUserAgent(),
          Accept: 'application/json',
        },
        validateStatus: () => true,
      });

    let { data, status } = await postOnce(apiRoot);

    if (
      apiRoot !== DEFAULT_JOOBLE_API_ROOT &&
      (status === 403 || status === 404)
    ) {
      console.warn(
        `[Jooble Search] ${apiRoot} HTTP ${status} — retrying ${DEFAULT_JOOBLE_API_ROOT}`
      );
      ({ data, status } = await postOnce(DEFAULT_JOOBLE_API_ROOT));
    }

    if (status === 403) {
      console.warn('[Jooble Search] Access denied — check JOOBLE_API_KEY');
      return { jobs: [], totalCount: 0, error: 'forbidden' };
    }
    if (status !== 200 || data == null) {
      console.warn('[Jooble Search] Non-OK response:', status);
      return { jobs: [], totalCount: 0, error: `http_${status}` };
    }

    const list = Array.isArray(data.jobs) ? data.jobs : [];
    const mapped = [];
    const seenLinks = new Set();
    for (const row of list) {
      const m = mapJoobleJobToListing(row);
      if (m && m.externalUrl && !seenLinks.has(m.externalUrl)) {
        seenLinks.add(m.externalUrl);
        mapped.push(m);
      }
    }

    const totalCount =
      typeof data.totalCount === 'number' && !Number.isNaN(data.totalCount)
        ? data.totalCount
        : mapped.length;

    return { jobs: mapped, totalCount };
  } catch (err) {
    console.warn('[Jooble Search] Request failed:', err.message);
    return { jobs: [], totalCount: 0, error: 'request_failed' };
  }
}

module.exports = {
  searchJoobleRemoteJobs,
  mapJoobleJobToListing,
};
