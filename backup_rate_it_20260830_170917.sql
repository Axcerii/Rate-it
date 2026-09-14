--
-- PostgreSQL database dump
--

\restrict P9X5cDvVv27MDV4RcGxlxyIFCaxSZHWUDvnynrnZvLhUYYHad4uh6Jn5drGfonx

-- Dumped from database version 15.19
-- Dumped by pg_dump version 15.19

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: playlists; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.playlists (
    id character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    is_custom boolean DEFAULT false,
    played_count integer DEFAULT 0,
    last_played timestamp with time zone,
    is_validated boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.playlists OWNER TO postgres;

--
-- Name: ratings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ratings (
    id integer NOT NULL,
    video_id integer,
    youtube_id character varying(50) NOT NULL,
    playlist_id character varying(50),
    session_id character varying(50),
    player_name character varying(100),
    rating integer NOT NULL,
    source character varying(20) DEFAULT 'PLAYER'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ratings_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.ratings OWNER TO postgres;

--
-- Name: ratings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ratings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.ratings_id_seq OWNER TO postgres;

--
-- Name: ratings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ratings_id_seq OWNED BY public.ratings.id;


--
-- Name: videos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.videos (
    id integer NOT NULL,
    playlist_id character varying(50),
    title character varying(255) NOT NULL,
    youtube_id character varying(50) NOT NULL,
    artist_name character varying(255),
    description text,
    mal_anime_id integer,
    mal_title character varying(255),
    order_index integer NOT NULL
);


ALTER TABLE public.videos OWNER TO postgres;

--
-- Name: videos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.videos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.videos_id_seq OWNER TO postgres;

--
-- Name: videos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.videos_id_seq OWNED BY public.videos.id;


--
-- Name: ratings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ratings ALTER COLUMN id SET DEFAULT nextval('public.ratings_id_seq'::regclass);


--
-- Name: videos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.videos ALTER COLUMN id SET DEFAULT nextval('public.videos_id_seq'::regclass);


--
-- Data for Name: playlists; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.playlists (id, name, description, is_custom, played_count, last_played, is_validated, created_at) FROM stdin;
anime-classics	Anime Classics	The most iconic anime themes and music of all time.	f	0	\N	f	2026-08-30 05:49:44.719708+00
PL-A5Q8BI	La Liste (Anime Opening)	Une 40aine d'openings d'animés sélectionnés parmi les meilleurs. Deux règles : 1 par animé, 1 par chanteur. Un max de variété. Des choix ont été fait, désolé.	f	1	2026-08-30 07:28:51.614095+00	t	2026-08-30 07:26:40.376536+00
PL-4ZX0HO	La Liste libérée (Anime Opening)	La Liste mais sans restriction et avec les recalés.	t	0	\N	f	2026-08-30 11:13:21.745048+00
\.


--
-- Data for Name: ratings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ratings (id, video_id, youtube_id, playlist_id, session_id, player_name, rating, source, created_at) FROM stdin;
\.


--
-- Data for Name: videos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.videos (id, playlist_id, title, youtube_id, artist_name, description, mal_anime_id, mal_title, order_index) FROM stdin;
30	PL-A5Q8BI	A Cruel Angel's Thesis (残酷な天使のテーゼ)	nU21rCWkuJw	Yoko Takahashi	Opening - Neon Genesis Evangelion	30	Shinseiki Evangelion	15
22	PL-A5Q8BI	Silhouette	zVgKnfN9i34	KANA-BOON	Opening 16 - Naruto Shippuden	1735	Naruto Shippuden	7
34	PL-A5Q8BI	Unravel	7aMOurgDB-o	TK from Ling Tosite Sigure	Opening 1 - Tokyo Ghoul	22319	Tokyo Ghoul	19
15	PL-A5Q8BI	We Are!	YoeP9w5UIlg	Hiroshi Kitadani	Opening 1 - One Piece	\N	\N	0
16	PL-A5Q8BI	Idol (アイドル)	PgBvV9ofjmA	YOASOBI	Opening 1 - [Oshi no Ko]	\N	\N	1
17	PL-A5Q8BI	Hello, World!	4J8jcI0WtzM	BUMP OF CHICKEN	Opening - 1 Kekkai Sensen (Blood Blockade Battlefront)	\N	\N	2
18	PL-A5Q8BI	Sincerely	ZAKuyZEyZjY	TRUE	Opening - Violet Evergarden	\N	\N	3
19	PL-A5Q8BI	Sunny (晴る)	iqsnJJK8GA4	Yorushika	Opening 2 - Sousou no Frieren	\N	\N	4
20	PL-A5Q8BI	KICK BACK	dFlDRhvM4L0	Kenshi Yonezu	Opening 1 - Chainsaw Man	\N	\N	5
21	PL-A5Q8BI	Cry Baby	By_JYrhx-WY	Official Hige Dandism	Opening 1 - Tokyo Revengers	\N	\N	6
23	PL-A5Q8BI	GO!!!	GBE1VkrL8b0	FLOW	Opening 4 - Naruto	\N	\N	8
24	PL-A5Q8BI	Ranbu no Melody (乱舞のメロディ)	5emM3JGI5JA	SID	Opening 13 - Bleach	\N	\N	9
25	PL-A5Q8BI	Shinzou wo Sasageyo (心臓を捧げよ)	CID-sYQNCew	Linked Horizon	Opening 3 - L'Attaque des titans (Shingeki no Kyojin)	\N	Shingeki no Kyojin	10
26	PL-A5Q8BI	Gurenge (紅蓮華)	pmanD_s7G3U	LiSA	Opening 1 - Demon Slayer (Kimetsu no Yaiba)	\N	Kimetsu no Yaiba	11
27	PL-A5Q8BI	My Dearest	1OLX83iWP-s	supercell	Opening 1 - Guilty Crown	\N	Guilty Crown	12
28	PL-A5Q8BI	Bling-Bang-Bang-Born	210R0ozmLwg	Creepy Nuts	Opening 2 - MASHLE	\N	Mashle: Shinkakusha Kouho Senbatsu Shiken-hen	13
29	PL-A5Q8BI	Naked Hero (裸の勇者)	dWZAH5w8jkQ	Vaundy	Opening 2 - Ranking of Kings (Ousama Ranking	\N	Ousama Ranking	14
31	PL-A5Q8BI	Again	XCsppc963NI	YUI	Opening 1 - Fullmetal Alchemist : Brotherhood	\N	Fullmetal Alchemist: Brotherhood	16
32	PL-A5Q8BI	Inferno	JBqxVX_LXvk	Mrs.GREEN APPLE	Opening 1 - Fire Force	\N	Enen no Shouboutai	17
33	PL-A5Q8BI	Netsujo no Spectrum (熱情のスペクトラム)	B_LsLoa28oI	Ikimono Gakari ( いきものがかり)	Opening 1 - The Seven Deadly Sins (Nanatsu No Taizai)	\N	Nanatsu no Taizai	18
35	PL-A5Q8BI	Where Our Blue Is (Ao no Sumika - 青のすみか)	gcgKUcJKxIs	Tatsuya Kitani	Opening 3 - Jujutsu Kaisen	\N	Jujutsu Kaisen 2nd Season	20
36	PL-A5Q8BI	Bokurano (ぼくらの)	JFDFFoBClLY	Eve (E ve)	Opening 11 - My Hero Academia	\N	Boku no Hero Academia 6th Season	21
37	PL-A5Q8BI	Hikarunara (光るなら)	ilgewFdmVL0	Goose House	Opening 1 - Your Lie in April (Shigatsu wa Kimi no Uso)	\N	Shigatsu wa Kimi no Uso	22
38	PL-A5Q8BI	My Soul, Your Beats!	Eksw56g-WBY	Lia	Opening - Angel Beats!	\N	Angel Beats!	23
39	PL-A5Q8BI	the WORLD	dIzWhwPkYtY	NIGHTMARE	Opening 1 - Death Note	\N	Death Note	24
40	PL-A5Q8BI	BLOODY STREAM	e0yrZXSXTSg	Coda	Opening 2 - JoJo's Bizarre Adventure (2012)	\N	JoJo no Kimyou na Bouken (TV)	25
41	PL-A5Q8BI	Black Catcher	akHMQOgGrd8	VK Blanka (Vickeblanka)	Opening 10 - Black Clover	\N	Black Clover	26
42	PL-A5Q8BI	Renai Circulation (恋愛サーキュレーション)	z-caezFDfTs	Hanazawa Kana	Opening 4 - Bakemonogatari	\N	Bakemonogatari	27
43	PL-A5Q8BI	Crying for Rain (Kawaki wo Ameku - カワキヲアメク)	Ua5UARWRYLA	Minami (美波)	Domestic Girlfriend (Domestic na Kanojo)	\N	Domestic na Kanojo	28
44	PL-A5Q8BI	Melissa (メリッサ)	1HOhxibhCWg	Porno Graffitti	Opening 1 - Fullmetal Alchemist (2003)	\N	Fullmetal Alchemist	29
45	PL-A5Q8BI	Ignite	vfYJz6P8Eoo	Eir Aoi	Opening 3 - Sword Art Online	\N	Sword Art Online II	30
46	PL-A5Q8BI	Wild Side	bgo9dJB_icw	ALI	Opening 1 - Beastars	\N	Beastars	31
47	PL-A5Q8BI	Duvet	92NCYUPtXfA	bôa	Opening - Serial Experiments Lain	\N	Serial Experiments Lain	32
48	PL-A5Q8BI	This Game	6CBp4qylX6I	Konomi Suzuki	Opening - No Game No Life	19815	\N	33
49	PL-A5Q8BI	Kyouran Hey Kids!! (狂乱 Hey Kids!!)	aZenmeRytEM	The Oral Cigarettes	Opening 2 - Noragami	30503	\N	34
50	PL-A5Q8BI	Fiction (フィクション)	XjHqfhOcK_0	sumika	Opening - Wotakoi: Love is Hard for Otaku	35968	\N	35
51	PL-A5Q8BI	Fly Hight!!	OTio-0LwlXE	BURNOUT SYNDROMES	Opening 4 - Haikyū!!	32935	\N	36
52	PL-A5Q8BI	Kaijuu (怪獣)	eZAocot63s8	sakanaction (サカナクション)	Orb: On the Movements of the Earth (Chi. Chikyuu no Undou ni Tsuite)	52215	\N	37
53	PL-A5Q8BI	Be a flower (花になって - Hana ni Natte)	EQ-DKvLQlyQ	Ryokuoushoku Shakai (緑黄色社会)	Opening 1 - Les Carnets de L'Apothicaire (Kusuriya no Hitorigoto)	54490	\N	38
54	PL-A5Q8BI	TANK!	NRI_8PUXx2A	SEATBELTS	Opening - Cowboy Bebop	1	\N	39
63	PL-4ZX0HO	We Are!	YoeP9w5UIlg	Hiroshi Kitadani	Opening 1 - One Piece	\N	\N	0
64	PL-4ZX0HO	Idol (アイドル)	PgBvV9ofjmA	YOASOBI	Opening 1 - [Oshi no Ko]	\N	\N	1
65	PL-4ZX0HO	Hello, World!	4J8jcI0WtzM	BUMP OF CHICKEN	Opening - 1 Kekkai Sensen (Blood Blockade Battlefront)	\N	\N	2
66	PL-4ZX0HO	Sincerely	ZAKuyZEyZjY	TRUE	Opening - Violet Evergarden	\N	\N	3
67	PL-4ZX0HO	Sunny (晴る)	iqsnJJK8GA4	Yorushika	Opening 2 - Sousou no Frieren	\N	\N	4
68	PL-4ZX0HO	KICK BACK	dFlDRhvM4L0	Kenshi Yonezu	Opening 1 - Chainsaw Man	\N	\N	5
69	PL-4ZX0HO	Cry Baby	By_JYrhx-WY	Official Hige Dandism	Opening 1 - Tokyo Revengers	\N	\N	6
70	PL-4ZX0HO	Silhouette	zVgKnfN9i34	KANA-BOON	Opening 16 - Naruto Shippuden	\N	\N	7
71	PL-4ZX0HO	GO!!!	GBE1VkrL8b0	FLOW	Opening 4 - Naruto	\N	\N	8
72	PL-4ZX0HO	Ranbu no Melody (乱舞のメロディ)	5emM3JGI5JA	SID	Opening 13 - Bleach	\N	\N	9
73	PL-4ZX0HO	Shinzou wo Sasageyo (心臓を捧げよ)	CID-sYQNCew	Linked Horizon	Opening 3 - L'Attaque des titans (Shingeki no Kyojin)	\N	\N	10
74	PL-4ZX0HO	Gurenge (紅蓮華)	pmanD_s7G3U	LiSA	Opening 1 - Demon Slayer (Kimetsu no Yaiba)	\N	\N	11
75	PL-4ZX0HO	My Dearest	1OLX83iWP-s	supercell	Opening 1 - Guilty Crown	\N	\N	12
76	PL-4ZX0HO	Bling-Bang-Bang-Born	210R0ozmLwg	Creepy Nuts	Opening 2 - MASHLE	\N	\N	13
77	PL-4ZX0HO	Naked Hero (裸の勇者)	dWZAH5w8jkQ	Vaundy	Opening 2 - Ranking of Kings (Ousama Ranking	\N	\N	14
78	PL-4ZX0HO	A Cruel Angel's Thesis (残酷な天使のテーゼ)	nU21rCWkuJw	Yoko Takahashi	Opening - Neon Genesis Evangelion	\N	\N	15
79	PL-4ZX0HO	Again	XCsppc963NI	YUI	Opening 1 - Fullmetal Alchemist : Brotherhood	\N	\N	16
80	PL-4ZX0HO	Inferno	JBqxVX_LXvk	Mrs.GREEN APPLE	Opening 1 - Fire Force	\N	\N	17
81	PL-4ZX0HO	Netsujo no Spectrum (熱情のスペクトラム)	B_LsLoa28oI	Ikimono Gakari ( いきものがかり)	Opening 1 - The Seven Deadly Sins (Nanatsu No Taizai)	\N	\N	18
82	PL-4ZX0HO	Unravel	7aMOurgDB-o	TK from Ling Tosite Sigure	Opening 1 - Tokyo Ghoul	\N	\N	19
83	PL-4ZX0HO	Where Our Blue Is (Ao no Sumika - 青のすみか)	gcgKUcJKxIs	Tatsuya Kitani	Opening 3 - Jujutsu Kaisen	\N	\N	20
84	PL-4ZX0HO	Bokurano (ぼくらの)	JFDFFoBClLY	Eve (E ve)	Opening 11 - My Hero Academia	\N	\N	21
85	PL-4ZX0HO	Hikarunara (光るなら)	ilgewFdmVL0	Goose House	Opening 1 - Your Lie in April (Shigatsu wa Kimi no Uso)	\N	\N	22
86	PL-4ZX0HO	My Soul, Your Beats!	Eksw56g-WBY	Lia	Opening - Angel Beats!	\N	\N	23
87	PL-4ZX0HO	the WORLD	dIzWhwPkYtY	NIGHTMARE	Opening 1 - Death Note	\N	\N	24
88	PL-4ZX0HO	BLOODY STREAM	e0yrZXSXTSg	Coda	Opening 2 - JoJo's Bizarre Adventure (2012)	\N	\N	25
89	PL-4ZX0HO	Black Catcher	akHMQOgGrd8	VK Blanka (Vickeblanka)	Opening 10 - Black Clover	\N	\N	26
90	PL-4ZX0HO	Renai Circulation (恋愛サーキュレーション)	z-caezFDfTs	Hanazawa Kana	Opening 4 - Bakemonogatari	\N	\N	27
91	PL-4ZX0HO	Crying for Rain (Kawaki wo Ameku - カワキヲアメク)	Ua5UARWRYLA	Minami (美波)	Domestic Girlfriend (Domestic na Kanojo)	\N	\N	28
92	PL-4ZX0HO	Melissa (メリッサ)	1HOhxibhCWg	Porno Graffitti	Opening 1 - Fullmetal Alchemist (2003)	\N	\N	29
93	PL-4ZX0HO	Ignite	vfYJz6P8Eoo	Eir Aoi	Opening 3 - Sword Art Online	\N	\N	30
94	PL-4ZX0HO	Wild Side	bgo9dJB_icw	ALI	Opening 1 - Beastars	\N	\N	31
95	PL-4ZX0HO	Duvet	92NCYUPtXfA	bôa	Opening - Serial Experiments Lain	\N	\N	32
96	PL-4ZX0HO	This Game	6CBp4qylX6I	Konomi Suzuki	Opening - No Game No Life	\N	\N	33
97	PL-4ZX0HO	Kyouran Hey Kids!! (狂乱 Hey Kids!!)	aZenmeRytEM	The Oral Cigarettes	Opening 2 - Noragami	\N	\N	34
98	PL-4ZX0HO	Fiction (フィクション)	XjHqfhOcK_0	sumika	Opening - Wotakoi: Love is Hard for Otaku	\N	\N	35
99	PL-4ZX0HO	Fly Hight!!	OTio-0LwlXE	BURNOUT SYNDROMES	Opening 4 - Haikyū!!	\N	\N	36
100	PL-4ZX0HO	Kaijuu (怪獣)	eZAocot63s8	sakanaction (サカナクション)	Orb: On the Movements of the Earth (Chi. Chikyuu no Undou ni Tsuite)	\N	\N	37
101	PL-4ZX0HO	Be a flower (花になって - Hana ni Natte)	EQ-DKvLQlyQ	Ryokuoushoku Shakai (緑黄色社会)	Opening 1 - Les Carnets de L'Apothicaire (Kusuriya no Hitorigoto)	\N	\N	38
102	PL-4ZX0HO	TANK!	NRI_8PUXx2A	SEATBELTS	Opening - Cowboy Bebop	\N	\N	39
103	PL-4ZX0HO	We go!	cPPeFqhAaxI	Hiroshi Kitadani	Opening 15 - One Piece	\N	One Piece	40
104	PL-4ZX0HO	THE HERO !!	atxYe-nOa9w	JAM Project	Opening 1 - One Punch Man	\N	One Punch Man	41
105	PL-4ZX0HO	DADDY! DADDY! DO!	lTlzDfhPtFA	Suzuki Masayuki & Suzuki Airi	Opening 2 - Kaguya-sama: Love is War	\N	Kaguya-sama wa Kokurasetai: Tensai-tachi no Renai Zunousen	42
106	PL-4ZX0HO	Haruka Kanata (Far Away)	e4Sk59QwYyE	Asian Kung-Fu Generation	Opening 2 - Naruto	\N	Naruto	43
107	PL-4ZX0HO	Re:Re	fodAJ-1dN3I	Asian Kung-Fu Generation	Opening - Erased (Boku dake ga Inai Machi)	\N	Boku dake ga Inai Machi	44
108	PL-4ZX0HO	Zankyou Sanka (残響散歌)	st4wcpjZeQQ	Aimer	Opening 3 - Demon Slayer (Kimetsu no Yaiba)	\N	Kimetsu no Yaiba: Yuukaku-hen	45
109	PL-4ZX0HO	crossing field	Y4kfe8R1Iqs	LiSA	Opening 1 - Sword Art Online	\N	Sword Art Online	46
110	PL-4ZX0HO	ReawakeR	C0zMWogztQs	LiSA & Felix (Stray Kids)	Opening 2 - Solo Leveling	\N	Ore dake Level Up na Ken Season 2: Arise from the Shadow	47
111	PL-4ZX0HO	Bravely You	0oS3hM0FgO8	Lia	Opening - Charlotte	\N	Charlotte	48
112	PL-4ZX0HO	Monster (Kaibutsu - 怪物)	-5M4lbEpn6c	YOASOBI	Opening 2 - Beastars	\N	Beastars	49
113	PL-4ZX0HO	Yuusha (勇者)	QoGM9hCxr4k	YOASOBI	Opening 1 - Frieren	\N	Sousou no Frieren	50
114	PL-4ZX0HO	Hyakka Ryouran (百花繚乱)	wOleNo7T6_4	Ikuta Lilas (幾田りら)	Opening 3 - Les Carnets de l'Apothicaire (Kusuriya no Hitorigoto)	\N	Kusuriya no Hitorigoto 2nd Season	51
115	PL-4ZX0HO	lulu.	C0BG3B7aksU	Mrs. GREEN APPLE	Opening 3 - Frieren	\N	Sousou no Frieren 2nd Season	52
116	PL-4ZX0HO	Lilac (ライラック)	Bcy8yp6iYGI	Mrs. GREEN APPLE	Opening - Oblivion Battery (Boukyaku Battery)	\N	Boukyaku Battery (TV)	53
117	PL-4ZX0HO	Zettai Reido (絶対零度)	IuSAC8ZDf1A	natori	Opening 1 - Wind Breaker	\N	Wind Breaker	54
118	PL-4ZX0HO	Daten (堕天)	AwXRPWmgLbU	Creepy Nuts	Opening 1 - Call of the night (Yofukashi no Uta)	\N	Yofukashi no Uta	55
119	PL-4ZX0HO	Work	04WuoQMhhxw	Ringo Sheena & Millennium Parade	Opening 1 - Hell's Paradise (Jigokuraku)	\N	Jigokuraku	56
120	PL-4ZX0HO	Mahi (麻痺)	Nn0uA7d_uHg	yama	Opening - 2.43: Seiin High School Boys Volleyball Team	\N	2.43: Seiin Koukou Danshi Volley-bu	57
121	PL-4ZX0HO	Mixed Nuts	U_rWZK_8vUY	Official Hige Dandism	Opening 1 - Spy x Family	\N	Spy x Family	58
122	PL-4ZX0HO	Souvenir	YOIJOJsUkUg	BUMP OF CHICKEN	Opening 2 - Spy x Family	\N	Spy x Family Part 2	59
123	PL-4ZX0HO	Karma	maAYwtk-yE4	BUMP OF CHICKEN	Opening - Tales of the Abyss (Anime)	\N	Tales of the Abyss	60
124	PL-4ZX0HO	Fatal (ファタール)	PAcf55v6zqQ	GEMN (Tatsuya Kitani & Kento Nakajima)	Opening 2 - [Oshi no ko]	\N	[Oshi no Ko] 2nd Season	61
125	PL-4ZX0HO	COLORS	G8CFuZ9MseQ	FLOW	Opening 1 - Code Geass: Lelouch of the Rebellion	\N	Code Geass: Hangyaku no Lelouch	62
126	PL-4ZX0HO	Sign	97dkzVU4p-M	FLOW	Opening 6 - Naruto Shippuden	\N	Naruto: Shippuuden	63
127	PL-4ZX0HO	Blue Bird	2upuBiEiXDk	Ikimono Gakari (いきものがかり)	Opening 3 - Naruto Shippuden	\N	Naruto: Shippuuden	64
128	PL-4ZX0HO	Onegai Muscle (お願いマッスル)	ijCRlmxUleI	Fairouz Ai & Ishikawa Kaito	Opening -  How Heavy Are the Dumbbells You Lift?	\N	Dumbbell Nan Kilo Moteru?	65
129	PL-4ZX0HO	Peace Sign	iQGAPewPH1s	Kenshi Yonezu	Opening 2 - My Hero Academia	\N	Boku no Hero Academia 2nd Season	66
130	PL-4ZX0HO	BOW AND ARROW	H3SUAiwfyp0	Kenshi Yonezu	Opening - Medalist	\N	Medalist	67
133	PL-4ZX0HO	Fake Town Baby	_16vOCt-sYk	UNISON SQUARE GARDEN	Opening 2 - Kekkai Sensen & Beyond (Blood Blockade Battlefront and Beyond)	\N	Kekkai Sensen & Beyond	70
134	PL-4ZX0HO	Kaikai Kitan (廻廻奇譚)	GwaRztMaoY0	Eve (E ve)	Opening 1 - Jujutsu Kaisen	\N	Jujutsu Kaisen	71
135	PL-4ZX0HO	AIZO	Xr032EhUDPw	King Gnu	Opening 5 - Jujutsu Kaisen	\N	Jujutsu Kaisen: Shimetsu Kaiyuu - Zenpen	72
136	PL-4ZX0HO	Mukanjyo	l5wAdQ-UkWY	Survive Said the Prophet	Opening 1 - Vinland Saga	\N	Vinland Saga	73
137	PL-4ZX0HO	Papermoon	-eYK3YP524A	Tommy heavenly6	Opening 2 - Soul Eater	\N	Soul Eater	74
138	PL-4ZX0HO	Guren no Yumiya (紅蓮の弓矢)	8OkpRK2_gVs	Linked Horizon	Opening 1 - L'Attaque des Titans (Shingeki no Kyojin)	\N	Shingeki no Kyojin	75
131	PL-4ZX0HO	History Maker	5u3RGhznctE	DEAN FUJIOKA	Opening - Yuri!!! on Ice	32995	\N	68
139	PL-4ZX0HO	Clattanoia	KOWcj7XKnfQ	OxT	Opening 1 - Overlord	\N	Overlord	76
140	PL-4ZX0HO	Paradisus-Paradoxum	iu_0kOfMGD0	MYTH & ROID	Opening 2 - Re:Zero	\N	Re:Zero kara Hajimeru Isekai Seikatsu	77
141	PL-4ZX0HO	only my railgun	NOt2qxWtBv0	fripSide	Opening 1 - A Certain Scientific Railgun (Toaru Kagaku no Railgun)	\N	Toaru Kagaku no Railgun	78
142	PL-4ZX0HO	Seishun Complex (Seishun Complex)	dlSbEP4V-gI	Kessoku Band	Opening 1 - Bocchi the Rock!	\N	Bocchi the Rock!	79
143	PL-4ZX0HO	Magic	0WsL3ysqGKQ	Ado	Opening - Cat's Eye (2025)	\N	Cat's♥Eye	80
144	PL-4ZX0HO	１•２•３	HgBfSmSqkRI	After the Rain	Opening 26 - Pokémon	\N	Pokemon (2019)	81
145	PL-4ZX0HO	XY&Z (Iku-Z)	rXWDOI4f4Wk	Rica Matsumoto	Opening 21 - Pokémon	\N	Pokemon XY&Z	82
146	PL-4ZX0HO	Deal with the devil	g04QC2Ewnl4	Tia	Opening 1 - Gambling School (Kakegurui)	\N	Kakegurui	83
147	PL-4ZX0HO	Rolling Star	n2dD_rPwlQg	Yui	Opening 5 - Bleach	\N	Bleach	84
148	PL-4ZX0HO	Easy Breezy	8-91y7BJ8QA	chelmico	Opening - Keep Your Hands Off Eizouken!	\N	Eizouken ni wa Te wo Dasu na!	85
149	PL-4ZX0HO	Brave Shine	WofLTwSi0uo	Aimer	Opening 2 - Fate Stay Night [Ulimited Blade Works]	\N	Fate/stay night: Unlimited Blade Works	86
150	PL-4ZX0HO	Kuusou Mesorogiwi (空想メソロギヰ)	LLDA9cfRLlg	Yosei Teikoku	Opening 1 - Mirai Nikki (Future Diary)	\N	Mirai Nikki (TV)	87
151	PL-4ZX0HO	LILIUM (Audio)	9GaVESwssxU	Noma Kumiko	Opening 1 - Elfen Lied (Audio uniquement)	\N	Elfen Lied	88
152	PL-4ZX0HO	Departure!	faqmNf_fZlE	Masatoshi Ono	Opening - Hunter x Hunter (2011)	\N	https://myanimelist.net/anime/11061/Hunter_x_Hunter_2011?q=hunter%20hunter&cat=anime	89
153	PL-4ZX0HO	The Day	yu0HjPzFYnY	Porno Graffiti	Opening 1 - My Hero Academia	\N	Boku no Hero Academia	90
154	PL-4ZX0HO	Song of the Dead	Tt4_enX63K0	KANA-BOON	Opening - Zom 100: Bucket List of the Dead	\N	Zom 100: Zombie ni Naru made ni Shitai 100 no Koto	91
155	PL-4ZX0HO	DAN DAN Kokoro Hikareteku	qfUbqI_q0Ho	the FIELD OF VIEW	Opening - Dragon Ball GT	\N	Dragon Ball GT	92
132	PL-4ZX0HO	Flyers	UjjTMNDZi-A	BRADIO	Opening - Death Parade	\N	Death Parade	69
\.


--
-- Name: ratings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ratings_id_seq', 1, false);


--
-- Name: videos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.videos_id_seq', 155, true);


--
-- Name: playlists playlists_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.playlists
    ADD CONSTRAINT playlists_pkey PRIMARY KEY (id);


--
-- Name: ratings ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_pkey PRIMARY KEY (id);


--
-- Name: videos videos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.videos
    ADD CONSTRAINT videos_pkey PRIMARY KEY (id);


--
-- Name: idx_ratings_playlist_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ratings_playlist_id ON public.ratings USING btree (playlist_id);


--
-- Name: idx_ratings_youtube_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ratings_youtube_id ON public.ratings USING btree (youtube_id);


--
-- Name: ratings ratings_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE SET NULL;


--
-- Name: videos videos_playlist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.videos
    ADD CONSTRAINT videos_playlist_id_fkey FOREIGN KEY (playlist_id) REFERENCES public.playlists(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict P9X5cDvVv27MDV4RcGxlxyIFCaxSZHWUDvnynrnZvLhUYYHad4uh6Jn5drGfonx

