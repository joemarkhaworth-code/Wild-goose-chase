// Films by country. `atlas` must match the country name in data/countries-110m.json.
// `code` is the ISO 3166 alpha-2 code (used for the flag).
const f = (title, year, director) => ({ title, year, director });

export const COUNTRIES = [
  { atlas: 'United States of America', name: 'United States', code: 'US', films: [
    f('Casablanca', 1942, 'Michael Curtiz'),
    f('Singin\' in the Rain', 1952, 'Gene Kelly & Stanley Donen'),
    f('The Godfather', 1972, 'Francis Ford Coppola'),
  ] },
  { atlas: 'Canada', name: 'Canada', code: 'CA', films: [
    f('The Sweet Hereafter', 1997, 'Atom Egoyan'),
    f('Incendies', 2010, 'Denis Villeneuve'),
  ] },
  { atlas: 'Mexico', name: 'Mexico', code: 'MX', films: [
    f('Amores perros', 2000, 'Alejandro González Iñárritu'),
    f('Y tu mamá también', 2001, 'Alfonso Cuarón'),
    f('Roma', 2018, 'Alfonso Cuarón'),
  ] },
  { atlas: 'Guatemala', name: 'Guatemala', code: 'GT', films: [
    f('Ixcanul', 2015, 'Jayro Bustamante'),
  ] },
  { atlas: 'Cuba', name: 'Cuba', code: 'CU', films: [
    f('Memories of Underdevelopment', 1968, 'Tomás Gutiérrez Alea'),
    f('Strawberry and Chocolate', 1993, 'Tomás Gutiérrez Alea & Juan Carlos Tabío'),
  ] },
  { atlas: 'Jamaica', name: 'Jamaica', code: 'JM', films: [
    f('The Harder They Come', 1972, 'Perry Henzell'),
  ] },
  { atlas: 'Colombia', name: 'Colombia', code: 'CO', films: [
    f('Embrace of the Serpent', 2015, 'Ciro Guerra'),
    f('Birds of Passage', 2018, 'Cristina Gallego & Ciro Guerra'),
  ] },
  { atlas: 'Venezuela', name: 'Venezuela', code: 'VE', films: [
    f('From Afar', 2015, 'Lorenzo Vigas'),
  ] },
  { atlas: 'Peru', name: 'Peru', code: 'PE', films: [
    f('The Milk of Sorrow', 2009, 'Claudia Llosa'),
  ] },
  { atlas: 'Brazil', name: 'Brazil', code: 'BR', films: [
    f('Central Station', 1998, 'Walter Salles'),
    f('City of God', 2002, 'Fernando Meirelles & Kátia Lund'),
    f('I\'m Still Here', 2024, 'Walter Salles'),
  ] },
  { atlas: 'Paraguay', name: 'Paraguay', code: 'PY', films: [
    f('The Heiresses', 2018, 'Marcelo Martinessi'),
  ] },
  { atlas: 'Uruguay', name: 'Uruguay', code: 'UY', films: [
    f('Whisky', 2004, 'Juan Pablo Rebella & Pablo Stoll'),
  ] },
  { atlas: 'Chile', name: 'Chile', code: 'CL', films: [
    f('No', 2012, 'Pablo Larraín'),
    f('A Fantastic Woman', 2017, 'Sebastián Lelio'),
  ] },
  { atlas: 'Argentina', name: 'Argentina', code: 'AR', films: [
    f('Nine Queens', 2000, 'Fabián Bielinsky'),
    f('The Secret in Their Eyes', 2009, 'Juan José Campanella'),
    f('Wild Tales', 2014, 'Damián Szifron'),
  ] },
  { atlas: 'United Kingdom', name: 'United Kingdom', code: 'GB', films: [
    f('The Third Man', 1949, 'Carol Reed'),
    f('Lawrence of Arabia', 1962, 'David Lean'),
    f('Trainspotting', 1996, 'Danny Boyle'),
  ] },
  { atlas: 'Ireland', name: 'Ireland', code: 'IE', films: [
    f('The Quiet Girl', 2022, 'Colm Bairéad'),
    f('The Banshees of Inisherin', 2022, 'Martin McDonagh'),
  ] },
  { atlas: 'Iceland', name: 'Iceland', code: 'IS', films: [
    f('Of Horses and Men', 2013, 'Benedikt Erlingsson'),
    f('Rams', 2015, 'Grímur Hákonarson'),
  ] },
  { atlas: 'France', name: 'France', code: 'FR', films: [
    f('The 400 Blows', 1959, 'François Truffaut'),
    f('Breathless', 1960, 'Jean-Luc Godard'),
    f('Amélie', 2001, 'Jean-Pierre Jeunet'),
  ] },
  { atlas: 'Spain', name: 'Spain', code: 'ES', films: [
    f('The Spirit of the Beehive', 1973, 'Víctor Erice'),
    f('Talk to Her', 2002, 'Pedro Almodóvar'),
    f('Volver', 2006, 'Pedro Almodóvar'),
  ] },
  { atlas: 'Portugal', name: 'Portugal', code: 'PT', films: [
    f('Tabu', 2012, 'Miguel Gomes'),
  ] },
  { atlas: 'Italy', name: 'Italy', code: 'IT', films: [
    f('Bicycle Thieves', 1948, 'Vittorio De Sica'),
    f('La Dolce Vita', 1960, 'Federico Fellini'),
    f('Cinema Paradiso', 1988, 'Giuseppe Tornatore'),
  ] },
  { atlas: 'Germany', name: 'Germany', code: 'DE', films: [
    f('Metropolis', 1927, 'Fritz Lang'),
    f('Run Lola Run', 1998, 'Tom Tykwer'),
    f('The Lives of Others', 2006, 'Florian Henckel von Donnersmarck'),
  ] },
  { atlas: 'Netherlands', name: 'Netherlands', code: 'NL', films: [
    f('Antonia\'s Line', 1995, 'Marleen Gorris'),
    f('Character', 1997, 'Mike van Diem'),
  ] },
  { atlas: 'Belgium', name: 'Belgium', code: 'BE', films: [
    f('Rosetta', 1999, 'Jean-Pierre & Luc Dardenne'),
    f('Close', 2022, 'Lukas Dhont'),
  ] },
  { atlas: 'Switzerland', name: 'Switzerland', code: 'CH', films: [
    f('My Life as a Zucchini', 2016, 'Claude Barras'),
  ] },
  { atlas: 'Austria', name: 'Austria', code: 'AT', films: [
    f('The Counterfeiters', 2007, 'Stefan Ruzowitzky'),
  ] },
  { atlas: 'Denmark', name: 'Denmark', code: 'DK', films: [
    f('Babette\'s Feast', 1987, 'Gabriel Axel'),
    f('Festen', 1998, 'Thomas Vinterberg'),
    f('Another Round', 2020, 'Thomas Vinterberg'),
  ] },
  { atlas: 'Norway', name: 'Norway', code: 'NO', films: [
    f('Kon-Tiki', 2012, 'Joachim Rønning & Espen Sandberg'),
    f('The Worst Person in the World', 2021, 'Joachim Trier'),
  ] },
  { atlas: 'Sweden', name: 'Sweden', code: 'SE', films: [
    f('The Seventh Seal', 1957, 'Ingmar Bergman'),
    f('Let the Right One In', 2008, 'Tomas Alfredson'),
  ] },
  { atlas: 'Finland', name: 'Finland', code: 'FI', films: [
    f('The Man Without a Past', 2002, 'Aki Kaurismäki'),
    f('Fallen Leaves', 2023, 'Aki Kaurismäki'),
  ] },
  { atlas: 'Estonia', name: 'Estonia', code: 'EE', films: [
    f('Tangerines', 2013, 'Zaza Urushadze'),
  ] },
  { atlas: 'Latvia', name: 'Latvia', code: 'LV', films: [
    f('Flow', 2024, 'Gints Zilbalodis'),
  ] },
  { atlas: 'Poland', name: 'Poland', code: 'PL', films: [
    f('Ida', 2013, 'Paweł Pawlikowski'),
    f('Cold War', 2018, 'Paweł Pawlikowski'),
  ] },
  { atlas: 'Czechia', name: 'Czechia', code: 'CZ', films: [
    f('Closely Watched Trains', 1966, 'Jiří Menzel'),
    f('Kolya', 1996, 'Jan Svěrák'),
  ] },
  { atlas: 'Slovakia', name: 'Slovakia', code: 'SK', films: [
    f('The Shop on Main Street', 1965, 'Ján Kadár & Elmar Klos'),
  ] },
  { atlas: 'Hungary', name: 'Hungary', code: 'HU', films: [
    f('Sátántangó', 1994, 'Béla Tarr'),
    f('Son of Saul', 2015, 'László Nemes'),
  ] },
  { atlas: 'Romania', name: 'Romania', code: 'RO', films: [
    f('The Death of Mr. Lazarescu', 2005, 'Cristi Puiu'),
    f('4 Months, 3 Weeks and 2 Days', 2007, 'Cristian Mungiu'),
  ] },
  { atlas: 'Serbia', name: 'Serbia', code: 'RS', films: [
    f('Underground', 1995, 'Emir Kusturica'),
  ] },
  { atlas: 'Bosnia and Herz.', name: 'Bosnia and Herzegovina', code: 'BA', films: [
    f('No Man\'s Land', 2001, 'Danis Tanović'),
    f('Quo Vadis, Aida?', 2020, 'Jasmila Žbanić'),
  ] },
  { atlas: 'Greece', name: 'Greece', code: 'GR', films: [
    f('Eternity and a Day', 1998, 'Theo Angelopoulos'),
    f('Dogtooth', 2009, 'Yorgos Lanthimos'),
  ] },
  { atlas: 'Turkey', name: 'Türkiye', code: 'TR', films: [
    f('Once Upon a Time in Anatolia', 2011, 'Nuri Bilge Ceylan'),
    f('Winter Sleep', 2014, 'Nuri Bilge Ceylan'),
  ] },
  { atlas: 'Ukraine', name: 'Ukraine', code: 'UA', films: [
    f('Earth', 1930, 'Oleksandr Dovzhenko'),
    f('Shadows of Forgotten Ancestors', 1965, 'Sergei Parajanov'),
  ] },
  { atlas: 'Russia', name: 'Russia', code: 'RU', films: [
    f('Stalker', 1979, 'Andrei Tarkovsky'),
    f('Burnt by the Sun', 1994, 'Nikita Mikhalkov'),
    f('Leviathan', 2014, 'Andrey Zvyagintsev'),
  ] },
  { atlas: 'Georgia', name: 'Georgia', code: 'GE', films: [
    f('Repentance', 1984, 'Tengiz Abuladze'),
  ] },
  { atlas: 'Armenia', name: 'Armenia', code: 'AM', films: [
    f('The Color of Pomegranates', 1969, 'Sergei Parajanov'),
  ] },
  { atlas: 'Israel', name: 'Israel', code: 'IL', films: [
    f('Waltz with Bashir', 2008, 'Ari Folman'),
  ] },
  { atlas: 'Palestine', name: 'Palestine', code: 'PS', films: [
    f('Paradise Now', 2005, 'Hany Abu-Assad'),
  ] },
  { atlas: 'Lebanon', name: 'Lebanon', code: 'LB', films: [
    f('Caramel', 2007, 'Nadine Labaki'),
    f('Capernaum', 2018, 'Nadine Labaki'),
  ] },
  { atlas: 'Jordan', name: 'Jordan', code: 'JO', films: [
    f('Theeb', 2014, 'Naji Abu Nowar'),
  ] },
  { atlas: 'Saudi Arabia', name: 'Saudi Arabia', code: 'SA', films: [
    f('Wadjda', 2012, 'Haifaa al-Mansour'),
  ] },
  { atlas: 'Iran', name: 'Iran', code: 'IR', films: [
    f('Children of Heaven', 1997, 'Majid Majidi'),
    f('Taste of Cherry', 1997, 'Abbas Kiarostami'),
    f('A Separation', 2011, 'Asghar Farhadi'),
  ] },
  { atlas: 'Afghanistan', name: 'Afghanistan', code: 'AF', films: [
    f('Osama', 2003, 'Siddiq Barmak'),
  ] },
  { atlas: 'Pakistan', name: 'Pakistan', code: 'PK', films: [
    f('Joyland', 2022, 'Saim Sadiq'),
  ] },
  { atlas: 'India', name: 'India', code: 'IN', films: [
    f('Pather Panchali', 1955, 'Satyajit Ray'),
    f('Lagaan', 2001, 'Ashutosh Gowariker'),
    f('RRR', 2022, 'S. S. Rajamouli'),
  ] },
  { atlas: 'Bangladesh', name: 'Bangladesh', code: 'BD', films: [
    f('The Clay Bird', 2002, 'Tareque Masud'),
  ] },
  { atlas: 'Bhutan', name: 'Bhutan', code: 'BT', films: [
    f('Lunana: A Yak in the Classroom', 2019, 'Pawo Choyning Dorji'),
  ] },
  { atlas: 'Mongolia', name: 'Mongolia', code: 'MN', films: [
    f('The Story of the Weeping Camel', 2003, 'Byambasuren Davaa & Luigi Falorni'),
  ] },
  { atlas: 'China', name: 'China', code: 'CN', films: [
    f('Raise the Red Lantern', 1991, 'Zhang Yimou'),
    f('Farewell My Concubine', 1993, 'Chen Kaige'),
    f('Hero', 2002, 'Zhang Yimou'),
  ] },
  { atlas: 'Taiwan', name: 'Taiwan', code: 'TW', films: [
    f('A City of Sadness', 1989, 'Hou Hsiao-hsien'),
    f('Eat Drink Man Woman', 1994, 'Ang Lee'),
    f('Yi Yi', 2000, 'Edward Yang'),
  ] },
  { atlas: 'South Korea', name: 'South Korea', code: 'KR', films: [
    f('Oldboy', 2003, 'Park Chan-wook'),
    f('Train to Busan', 2016, 'Yeon Sang-ho'),
    f('Parasite', 2019, 'Bong Joon-ho'),
  ] },
  { atlas: 'Japan', name: 'Japan', code: 'JP', films: [
    f('Tokyo Story', 1953, 'Yasujirō Ozu'),
    f('Seven Samurai', 1954, 'Akira Kurosawa'),
    f('Spirited Away', 2001, 'Hayao Miyazaki'),
  ] },
  { atlas: 'Vietnam', name: 'Vietnam', code: 'VN', films: [
    f('The Scent of Green Papaya', 1993, 'Tran Anh Hung'),
  ] },
  { atlas: 'Thailand', name: 'Thailand', code: 'TH', films: [
    f('Uncle Boonmee Who Can Recall His Past Lives', 2010, 'Apichatpong Weerasethakul'),
  ] },
  { atlas: 'Cambodia', name: 'Cambodia', code: 'KH', films: [
    f('The Missing Picture', 2013, 'Rithy Panh'),
  ] },
  { atlas: 'Philippines', name: 'Philippines', code: 'PH', films: [
    f('Manila in the Claws of Light', 1975, 'Lino Brocka'),
  ] },
  { atlas: 'Indonesia', name: 'Indonesia', code: 'ID', films: [
    f('The Raid', 2011, 'Gareth Evans'),
  ] },
  { atlas: 'Australia', name: 'Australia', code: 'AU', films: [
    f('Picnic at Hanging Rock', 1975, 'Peter Weir'),
    f('Mad Max: Fury Road', 2015, 'George Miller'),
  ] },
  { atlas: 'New Zealand', name: 'New Zealand', code: 'NZ', films: [
    f('Whale Rider', 2002, 'Niki Caro'),
    f('Hunt for the Wilderpeople', 2016, 'Taika Waititi'),
  ] },
  { atlas: 'Egypt', name: 'Egypt', code: 'EG', films: [
    f('Cairo Station', 1958, 'Youssef Chahine'),
  ] },
  { atlas: 'Morocco', name: 'Morocco', code: 'MA', films: [
    f('The Blue Caftan', 2022, 'Maryam Touzani'),
  ] },
  { atlas: 'Algeria', name: 'Algeria', code: 'DZ', films: [
    f('The Battle of Algiers', 1966, 'Gillo Pontecorvo'),
  ] },
  { atlas: 'Tunisia', name: 'Tunisia', code: 'TN', films: [
    f('The Man Who Sold His Skin', 2020, 'Kaouther Ben Hania'),
  ] },
  { atlas: 'Senegal', name: 'Senegal', code: 'SN', films: [
    f('Black Girl', 1966, 'Ousmane Sembène'),
    f('Touki Bouki', 1973, 'Djibril Diop Mambéty'),
  ] },
  { atlas: 'Mauritania', name: 'Mauritania', code: 'MR', films: [
    f('Timbuktu', 2014, 'Abderrahmane Sissako'),
  ] },
  { atlas: 'Mali', name: 'Mali', code: 'ML', films: [
    f('Yeelen', 1987, 'Souleymane Cissé'),
  ] },
  { atlas: 'Burkina Faso', name: 'Burkina Faso', code: 'BF', films: [
    f('Tilaï', 1990, 'Idrissa Ouédraogo'),
  ] },
  { atlas: 'Nigeria', name: 'Nigeria', code: 'NG', films: [
    f('The Wedding Party', 2016, 'Kemi Adetiba'),
    f('Lionheart', 2018, 'Genevieve Nnaji'),
  ] },
  { atlas: 'Chad', name: 'Chad', code: 'TD', films: [
    f('A Screaming Man', 2010, 'Mahamat-Saleh Haroun'),
  ] },
  { atlas: 'Ethiopia', name: 'Ethiopia', code: 'ET', films: [
    f('Lamb', 2015, 'Yared Zeleke'),
  ] },
  { atlas: 'Kenya', name: 'Kenya', code: 'KE', films: [
    f('Rafiki', 2018, 'Wanuri Kahiu'),
  ] },
  { atlas: 'Zambia', name: 'Zambia', code: 'ZM', films: [
    f('I Am Not a Witch', 2017, 'Rungano Nyoni'),
  ] },
  { atlas: 'Lesotho', name: 'Lesotho', code: 'LS', films: [
    f('This Is Not a Burial, It\'s a Resurrection', 2019, 'Lemohang Jeremiah Mosese'),
  ] },
  { atlas: 'South Africa', name: 'South Africa', code: 'ZA', films: [
    f('Tsotsi', 2005, 'Gavin Hood'),
    f('District 9', 2009, 'Neill Blomkamp'),
  ] },
];

const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

for (const c of COUNTRIES) {
  for (const film of c.films) {
    film.id = `${c.code}-${film.year}-${slug(film.title)}`;
    film.country = c;
  }
}

export const ALL_FILMS = COUNTRIES.flatMap((c) => c.films);
export const FILM_BY_ID = new Map(ALL_FILMS.map((film) => [film.id, film]));

export function flagOf(code) {
  return String.fromCodePoint(...[...code].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}
