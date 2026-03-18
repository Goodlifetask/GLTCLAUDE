import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import all translation files
import en from '../public/locales/en.json';
import es from '../public/locales/es.json';
import fr from '../public/locales/fr.json';
import de from '../public/locales/de.json';
import pt from '../public/locales/pt.json';
import ar from '../public/locales/ar.json';
import hi from '../public/locales/hi.json';
import zh from '../public/locales/zh.json';
import ja from '../public/locales/ja.json';
import ko from '../public/locales/ko.json';
import ru from '../public/locales/ru.json';
import tr from '../public/locales/tr.json';
import it from '../public/locales/it.json';
import nl from '../public/locales/nl.json';
import pl from '../public/locales/pl.json';
import sv from '../public/locales/sv.json';
import da from '../public/locales/da.json';
import no from '../public/locales/no.json';
import fi from '../public/locales/fi.json';
import cs from '../public/locales/cs.json';
import ro from '../public/locales/ro.json';
import hu from '../public/locales/hu.json';
import el from '../public/locales/el.json';
import uk from '../public/locales/uk.json';
import he from '../public/locales/he.json';
import fa from '../public/locales/fa.json';
import ur from '../public/locales/ur.json';
import bn from '../public/locales/bn.json';
import ta from '../public/locales/ta.json';
import te from '../public/locales/te.json';
import mr from '../public/locales/mr.json';
import gu from '../public/locales/gu.json';
import pa from '../public/locales/pa.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en:    { translation: en },
      'en-GB': { translation: en },
      es:    { translation: es },
      'es-MX': { translation: es },
      fr:    { translation: fr },
      'fr-CA': { translation: fr },
      de:    { translation: de },
      pt:    { translation: pt },
      'pt-BR': { translation: pt },
      ar:    { translation: ar },
      hi:    { translation: hi },
      zh:    { translation: zh },
      'zh-TW': { translation: zh },
      ja:    { translation: ja },
      ko:    { translation: ko },
      ru:    { translation: ru },
      tr:    { translation: tr },
      it:    { translation: it },
      nl:    { translation: nl },
      pl:    { translation: pl },
      sv:    { translation: sv },
      da:    { translation: da },
      no:    { translation: no },
      fi:    { translation: fi },
      cs:    { translation: cs },
      ro:    { translation: ro },
      hu:    { translation: hu },
      el:    { translation: el },
      uk:    { translation: uk },
      he:    { translation: he },
      fa:    { translation: fa },
      ur:    { translation: ur },
      bn:    { translation: bn },
      ta:    { translation: ta },
      te:    { translation: te },
      mr:    { translation: mr },
      gu:    { translation: gu },
      pa:    { translation: pa },
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n;
