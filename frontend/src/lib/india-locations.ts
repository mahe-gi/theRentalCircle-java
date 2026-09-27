/**
 * Comprehensive Indian Administrative Divisions & Geocoding Utilities
 *
 * Provides:
 * - Complete catalog of all 28 Indian States & 8 Union Territories
 * - Full official districts mapped per State / UT (~780 districts)
 * - Official Postal PIN Code lookup via https://api.postalpincode.in
 * - Reverse & Forward geocoding via OpenStreetMap Nominatim
 * - Browser Geolocation helper for 1-click current location auto-fill
 */

export const INDIAN_STATES: string[] = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

export const STATE_DISTRICTS_MAP: Record<string, string[]> = {
  "Andaman and Nicobar Islands": [
    "Nicobar",
    "North and Middle Andaman",
    "South Andaman",
  ],
  "Andhra Pradesh": [
    "Alluri Sitharama Raju",
    "Anakapalli",
    "Ananthapuramu",
    "Annamayya",
    "Bapatla",
    "Chittoor",
    "Dr. B.R. Ambedkar Konaseema",
    "East Godavari",
    "Eluru",
    "Guntur",
    "Kakinada",
    "Krishna",
    "Kurnool",
    "NTR",
    "Nandyal",
    "Palnadu",
    "Parvathipuram Manyam",
    "Prakasam",
    "Sri Potti Sriramulu Nellore",
    "Sri Sathya Sai",
    "Srikakulam",
    "Tirupati",
    "Visakhapatnam",
    "Vizianagaram",
    "West Godavari",
    "YSR Kadapa",
  ],
  "Arunachal Pradesh": [
    "Anjaw",
    "Changlang",
    "Dibang Valley",
    "East Kameng",
    "East Siang",
    "Kamle",
    "Kra Daadi",
    "Kurung Kumey",
    "Lepa Rada",
    "Lohit",
    "Longding",
    "Lower Dibang Valley",
    "Lower Siang",
    "Lower Subansiri",
    "Namsai",
    "Pakke Kessang",
    "Papum Pare",
    "Shi Yomi",
    "Siang",
    "Tawang",
    "Tirap",
    "Upper Siang",
    "Upper Subansiri",
    "West Kameng",
    "West Siang",
  ],
  "Assam": [
    "Baksa",
    "Barpeta",
    "Biswanath",
    "Bongaigaon",
    "Cachar",
    "Charaideo",
    "Chirang",
    "Darrang",
    "Dhemaji",
    "Dhubri",
    "Dibrugarh",
    "Dima Hasao",
    "Goalpara",
    "Golaghat",
    "Hailakandi",
    "Hojai",
    "Jorhat",
    "Kamrup",
    "Kamrup Metropolitan",
    "Karbi Anglong",
    "Karimganj",
    "Kokrajhar",
    "Lakhimpur",
    "Majuli",
    "Morigaon",
    "Nagaon",
    "Nalbari",
    "Sivasagar",
    "Sonitpur",
    "South Salmara-Mankachar",
    "Tinsukia",
    "Udalguri",
    "West Karbi Anglong",
  ],
  "Bihar": [
    "Araria",
    "Arwal",
    "Aurangabad",
    "Banka",
    "Begusarai",
    "Bhagalpur",
    "Bhojpur",
    "Buxar",
    "Darbhanga",
    "East Champaran",
    "Gaya",
    "Gopalganj",
    "Jamui",
    "Jehanabad",
    "Kaimur",
    "Katihar",
    "Khagaria",
    "Kishanganj",
    "Lakhisarai",
    "Madhepura",
    "Madhubani",
    "Munger",
    "Muzaffarpur",
    "Nalanda",
    "Nawada",
    "Patna",
    "Purnia",
    "Rohtas",
    "Saharsa",
    "Samastipur",
    "Saran",
    "Sheikhpura",
    "Sheohar",
    "Sitamarhi",
    "Siwan",
    "Supaul",
    "Vaishali",
    "West Champaran",
  ],
  "Chandigarh": [
    "Chandigarh",
  ],
  "Chhattisgarh": [
    "Balod",
    "Baloda Bazar",
    "Balrampur",
    "Bastar",
    "Bemetara",
    "Bijapur",
    "Bilaspur",
    "Dantewada",
    "Dhamtari",
    "Durg",
    "Gariaband",
    "Gaurela-Pendra-Marwahi",
    "Janjgir-Champa",
    "Jashpur",
    "Kabirdham",
    "Kanker",
    "Khairagarh-Chhuikhadan-Gandai",
    "Kondagaon",
    "Korba",
    "Koriya",
    "Mahasamund",
    "Manendragarh-Chirmiri-Bharatpur",
    "Mohla-Manpur-Ambagarh Chowki",
    "Mungeli",
    "Narayanpur",
    "Raigarh",
    "Raipur",
    "Rajnandgaon",
    "Sakti",
    "Sarangarh-Bilaigarh",
    "Sukma",
    "Surajpur",
    "Surguja",
  ],
  "Dadra and Nagar Haveli and Daman and Diu": [
    "Dadra and Nagar Haveli",
    "Daman",
    "Diu",
  ],
  "Delhi": [
    "Central Delhi",
    "East Delhi",
    "New Delhi",
    "North Delhi",
    "North East Delhi",
    "North West Delhi",
    "Shahdara",
    "South Delhi",
    "South East Delhi",
    "South West Delhi",
    "West Delhi",
  ],
  "Goa": [
    "North Goa",
    "South Goa",
  ],
  "Gujarat": [
    "Ahmedabad",
    "Amreli",
    "Anand",
    "Aravalli",
    "Banaskantha",
    "Bharuch",
    "Bhavnagar",
    "Botad",
    "Chhota Udaipur",
    "Dahod",
    "Dang",
    "Devbhumi Dwarka",
    "Gandhinagar",
    "Gir Somnath",
    "Jamnagar",
    "Junagadh",
    "Kheda",
    "Kutch",
    "Mahisagar",
    "Mehsana",
    "Morbi",
    "Narmada",
    "Navsari",
    "Panchmahal",
    "Patan",
    "Porbandar",
    "Rajkot",
    "Sabarkantha",
    "Surat",
    "Surendranagar",
    "Tapi",
    "Vadodara",
    "Valsad",
  ],
  "Haryana": [
    "Ambala",
    "Bhiwani",
    "Charkhi Dadri",
    "Faridabad",
    "Fatehabad",
    "Gurugram",
    "Hisar",
    "Jhajjar",
    "Jind",
    "Kaithal",
    "Karnal",
    "Kurukshetra",
    "Mahendragarh",
    "Nuh",
    "Palwal",
    "Panchkula",
    "Panipat",
    "Rewari",
    "Rohtak",
    "Sirsa",
    "Sonipat",
    "Yamunanagar",
  ],
  "Himachal Pradesh": [
    "Bilaspur",
    "Chamba",
    "Hamirpur",
    "Kangra",
    "Kinnaur",
    "Kullu",
    "Lahaul and Spiti",
    "Mandi",
    "Shimla",
    "Sirmaur",
    "Solan",
    "Una",
  ],
  "Jammu and Kashmir": [
    "Anantnag",
    "Bandipora",
    "Baramulla",
    "Budgam",
    "Doda",
    "Ganderbal",
    "Jammu",
    "Kathua",
    "Kishtwar",
    "Kulgam",
    "Kupwara",
    "Poonch",
    "Pulwama",
    "Rajouri",
    "Ramban",
    "Reasi",
    "Samba",
    "Shopian",
    "Srinagar",
    "Udhampur",
  ],
  "Jharkhand": [
    "Bokaro",
    "Chatra",
    "Deoghar",
    "Dhanbad",
    "Dumka",
    "East Singhbhum",
    "Garhwa",
    "Giridih",
    "Godda",
    "Gumla",
    "Hazaribagh",
    "Jamtara",
    "Khunti",
    "Koderma",
    "Latehar",
    "Lohardaga",
    "Pakur",
    "Palamu",
    "Ramgarh",
    "Ranchi",
    "Sahebganj",
    "Seraikela Kharsawan",
    "Simdega",
    "West Singhbhum",
  ],
  "Karnataka": [
    "Bagalkote",
    "Ballari",
    "Belagavi",
    "Bengaluru Rural",
    "Bengaluru Urban",
    "Bidar",
    "Chamarajanagar",
    "Chikkaballapura",
    "Chikkamagaluru",
    "Chitradurga",
    "Dakshina Kannada",
    "Davanagere",
    "Dharwad",
    "Gadag",
    "Hassan",
    "Haveri",
    "Kalaburagi",
    "Kodagu",
    "Kolar",
    "Koppal",
    "Mandya",
    "Mysuru",
    "Raichur",
    "Ramanagara",
    "Shivamogga",
    "Tumakuru",
    "Udupi",
    "Uttara Kannada",
    "Vijayanagara",
    "Vijayapura",
    "Yadgir",
  ],
  "Kerala": [
    "Alappuzha",
    "Ernakulam",
    "Idukki",
    "Kannur",
    "Kasaragod",
    "Kollam",
    "Kottayam",
    "Kozhikode",
    "Malappuram",
    "Palakkad",
    "Pathanamthitta",
    "Thiruvananthapuram",
    "Thrissur",
    "Wayanad",
  ],
  "Ladakh": [
    "Kargil",
    "Leh",
  ],
  "Lakshadweep": [
    "Lakshadweep",
  ],
  "Madhya Pradesh": [
    "Agar Malwa",
    "Alirajpur",
    "Anuppur",
    "Ashoknagar",
    "Balaghat",
    "Barwani",
    "Betul",
    "Bhind",
    "Bhopal",
    "Burhanpur",
    "Chhatarpur",
    "Chhindwara",
    "Damoh",
    "Datia",
    "Dewas",
    "Dhar",
    "Dindori",
    "Guna",
    "Gwalior",
    "Harda",
    "Hoshangabad",
    "Indore",
    "Jabalpur",
    "Jhabua",
    "Katni",
    "Khandwa",
    "Khargone",
    "Maihar",
    "Mandla",
    "Mandsaur",
    "Mauganj",
    "Morena",
    "Narsinghpur",
    "Neemuch",
    "Niwari",
    "Pandhurna",
    "Panna",
    "Raisen",
    "Rajgarh",
    "Ratlam",
    "Rewa",
    "Sagar",
    "Satna",
    "Sehore",
    "Seoni",
    "Shahdol",
    "Shajapur",
    "Sheopur",
    "Shivpuri",
    "Sidhi",
    "Singrauli",
    "Tikamgarh",
    "Ujjain",
    "Umaria",
    "Vidisha",
  ],
  "Maharashtra": [
    "Ahmednagar",
    "Akola",
    "Amravati",
    "Beed",
    "Bhandara",
    "Buldhana",
    "Chandrapur",
    "Chhatrapati Sambhajinagar",
    "Dharashiv",
    "Dhule",
    "Gadchiroli",
    "Gondia",
    "Hingoli",
    "Jalgaon",
    "Jalna",
    "Kolhapur",
    "Latur",
    "Mumbai City",
    "Mumbai Suburban",
    "Nagpur",
    "Nanded",
    "Nandurbar",
    "Nashik",
    "Palghar",
    "Parbhani",
    "Pune",
    "Raigad",
    "Ratnagiri",
    "Sangli",
    "Satara",
    "Sindhudurg",
    "Solapur",
    "Thane",
    "Wardha",
    "Washim",
    "Yavatmal",
  ],
  "Manipur": [
    "Bishnupur",
    "Chandel",
    "Churachandpur",
    "Imphal East",
    "Imphal West",
    "Jiribam",
    "Kakching",
    "Kamjong",
    "Kangpokpi",
    "Noney",
    "Pherzawl",
    "Senapati",
    "Tamenglong",
    "Tengnoupal",
    "Thoubal",
    "Ukhrul",
  ],
  "Meghalaya": [
    "East Garo Hills",
    "East Jaintia Hills",
    "East Khasi Hills",
    "Eastern West Khasi Hills",
    "North Garo Hills",
    "Ri Bhoi",
    "South Garo Hills",
    "South West Garo Hills",
    "South West Khasi Hills",
    "West Garo Hills",
    "West Jaintia Hills",
    "West Khasi Hills",
  ],
  "Mizoram": [
    "Aizawl",
    "Champhai",
    "Hnahthial",
    "Khawzawl",
    "Kolasib",
    "Lawngtlai",
    "Lunglei",
    "Mamit",
    "Saiha",
    "Saitual",
    "Serchhip",
  ],
  "Nagaland": [
    "Chümoukedima",
    "Dimapur",
    "Kiphire",
    "Kohima",
    "Longleng",
    "Mokokchung",
    "Mon",
    "Niuland",
    "Noklak",
    "Peren",
    "Phek",
    "Shamator",
    "Tseminyü",
    "Tuensang",
    "Wokha",
    "Zünheboto",
  ],
  "Odisha": [
    "Angul",
    "Balangir",
    "Balasore",
    "Bargarh",
    "Bhadrak",
    "Boudh",
    "Cuttack",
    "Deogarh",
    "Dhenkanal",
    "Gajapati",
    "Ganjam",
    "Jagatsinghpur",
    "Jajpur",
    "Jharsuguda",
    "Kalahandi",
    "Kandhamal",
    "Kendrapara",
    "Kendujhar",
    "Khordha",
    "Koraput",
    "Malkangiri",
    "Mayurbhanj",
    "Nabarangpur",
    "Nayagarh",
    "Nuapada",
    "Puri",
    "Rayagada",
    "Sambalpur",
    "Subarnapur",
    "Sundargarh",
  ],
  "Puducherry": [
    "Karaikal",
    "Mahe",
    "Puducherry",
    "Yanam",
  ],
  "Punjab": [
    "Amritsar",
    "Barnala",
    "Bathinda",
    "Faridkot",
    "Fatehgarh Sahib",
    "Fazilka",
    "Ferozepur",
    "Gurdaspur",
    "Hoshiarpur",
    "Jalandhar",
    "Kapurthala",
    "Ludhiana",
    "Malerkotla",
    "Mansa",
    "Moga",
    "Muktsar",
    "Pathankot",
    "Patiala",
    "Rupnagar",
    "Sahibzada Ajit Singh Nagar",
    "Sangrur",
    "Shahid Bhagat Singh Nagar",
    "Tarn Taran",
  ],
  "Rajasthan": [
    "Ajmer",
    "Alwar",
    "Anupgarh",
    "Balotra",
    "Banswara",
    "Baran",
    "Barmer",
    "Beawar",
    "Bharatpur",
    "Bhilwara",
    "Bikaner",
    "Bundi",
    "Chittorgarh",
    "Churu",
    "Dausa",
    "Deeg",
    "Dholpur",
    "Didwana-Kuchaman",
    "Dudu",
    "Dungarpur",
    "Ganganagar",
    "Gangapur City",
    "Hanumangarh",
    "Jaipur",
    "Jaipur Rural",
    "Jaisalmer",
    "Jalore",
    "Jhalawar",
    "Jhunjhunu",
    "Jodhpur",
    "Jodhpur Rural",
    "Karauli",
    "Kekri",
    "Khairthal-Tijara",
    "Kota",
    "Kotputli-Behror",
    "Nagaur",
    "Neem Ka Thana",
    "Pali",
    "Phalodi",
    "Pratapgarh",
    "Rajsamand",
    "Salumbar",
    "Sanchore",
    "Sawai Madhopur",
    "Shahpura",
    "Sikar",
    "Sirohi",
    "Tonk",
    "Udaipur",
  ],
  "Sikkim": [
    "Gangtok",
    "Gyalshing",
    "Mangan",
    "Namchi",
    "Pakyong",
    "Soreng",
  ],
  "Tamil Nadu": [
    "Ariyalur",
    "Chengalpattu",
    "Chennai",
    "Coimbatore",
    "Cuddalore",
    "Dharmapuri",
    "Dindigul",
    "Erode",
    "Kallakurichi",
    "Kanchipuram",
    "Kanyakumari",
    "Karur",
    "Krishnagiri",
    "Madurai",
    "Mayiladuthurai",
    "Nagapattinam",
    "Namakkal",
    "Nilgiris",
    "Perambalur",
    "Pudukkottai",
    "Ramanathapuram",
    "Ranipet",
    "Salem",
    "Sivaganga",
    "Tenkasi",
    "Thanjavur",
    "Theni",
    "Thoothukudi",
    "Tiruchirappalli",
    "Tirunelveli",
    "Tirupathur",
    "Tiruppur",
    "Tiruvallur",
    "Tiruvannamalai",
    "Tiruvarur",
    "Vellore",
    "Viluppuram",
    "Virudhunagar",
  ],
  "Telangana": [
    "Adilabad",
    "Bhadradri Kothagudem",
    "Hanumakonda",
    "Hyderabad",
    "Jagtial",
    "Jangaon",
    "Jayashankar Bhupalpally",
    "Jogulamba Gadwal",
    "Kamareddy",
    "Karimnagar",
    "Khammam",
    "Kumuram Bheem Asifabad",
    "Mahabubabad",
    "Mahabubnagar",
    "Mancherial",
    "Medak",
    "Medchal-Malkajgiri",
    "Mulugu",
    "Nagarkurnool",
    "Nalgonda",
    "Narayanpet",
    "Nirmal",
    "Nizamabad",
    "Peddapalli",
    "Rajanna Sircilla",
    "Rangareddy",
    "Sangareddy",
    "Siddipet",
    "Suryapet",
    "Vikarabad",
    "Wanaparthy",
    "Warangal",
    "Yadadri Bhuvanagiri",
  ],
  "Tripura": [
    "Dhalai",
    "Gomati",
    "Khowai",
    "North Tripura",
    "Sepahijala",
    "South Tripura",
    "Unakoti",
    "West Tripura",
  ],
  "Uttar Pradesh": [
    "Agra",
    "Aligarh",
    "Ambedkar Nagar",
    "Amethi",
    "Amroha",
    "Auraiya",
    "Ayodhya",
    "Azamgarh",
    "Baghpat",
    "Bahraich",
    "Ballia",
    "Balrampur",
    "Banda",
    "Barabanki",
    "Bareilly",
    "Basti",
    "Bhadohi",
    "Bijnor",
    "Budaun",
    "Bulandshahr",
    "Chandauli",
    "Chitrakoot",
    "Deoria",
    "Etah",
    "Etawah",
    "Farrukhabad",
    "Fatehpur",
    "Firozabad",
    "Gautam Buddha Nagar",
    "Ghaziabad",
    "Ghazipur",
    "Gonda",
    "Gorakhpur",
    "Hamirpur",
    "Hapur",
    "Hardoi",
    "Hathras",
    "Jalaun",
    "Jaunpur",
    "Jhansi",
    "Kannauj",
    "Kanpur Dehat",
    "Kanpur Nagar",
    "Kasganj",
    "Kaushambi",
    "Kheri",
    "Kushinagar",
    "Lalitpur",
    "Lucknow",
    "Maharajganj",
    "Mahoba",
    "Mainpuri",
    "Mathura",
    "Mau",
    "Meerut",
    "Mirzapur",
    "Moradabad",
    "Muzaffarnagar",
    "Pilibhit",
    "Pratapgarh",
    "Prayagraj",
    "Raebareli",
    "Rampur",
    "Saharanpur",
    "Sambhal",
    "Sant Kabir Nagar",
    "Shahjahanpur",
    "Shamli",
    "Shravasti",
    "Siddharthnagar",
    "Sitapur",
    "Sonbhadra",
    "Sultanpur",
    "Unnao",
    "Varanasi",
  ],
  "Uttarakhand": [
    "Almora",
    "Bageshwar",
    "Chamoli",
    "Champawat",
    "Dehradun",
    "Haridwar",
    "Nainital",
    "Pauri Garhwal",
    "Pithoragarh",
    "Rudraprayag",
    "Tehri Garhwal",
    "Udham Singh Nagar",
    "Uttarkashi",
  ],
  "West Bengal": [
    "Alipurduar",
    "Bankura",
    "Birbhum",
    "Cooch Behar",
    "Dakshin Dinajpur",
    "Darjeeling",
    "Hooghly",
    "Howrah",
    "Jalpaiguri",
    "Jhargram",
    "Kalimpong",
    "Kolkata",
    "Malda",
    "Murshidabad",
    "Nadia",
    "North 24 Parganas",
    "Paschim Bardhaman",
    "Paschim Medinipur",
    "Purba Bardhaman",
    "Purba Medinipur",
    "Purulia",
    "South 24 Parganas",
    "Uttar Dinajpur",
  ],
};

export const STATE_COORDINATES: Record<string, [number, number]> = {
  "Andaman and Nicobar Islands": [11.7401, 92.6586],
  "Andhra Pradesh": [15.9129, 79.74],
  "Arunachal Pradesh": [28.218, 94.7278],
  "Assam": [26.2006, 92.9376],
  "Bihar": [25.0961, 85.3131],
  "Chandigarh": [30.7333, 76.7794],
  "Chhattisgarh": [21.2787, 81.8661],
  "Dadra and Nagar Haveli and Daman and Diu": [20.4283, 72.8397],
  "Delhi": [28.7041, 77.1025],
  "Goa": [15.2993, 74.124],
  "Gujarat": [22.2587, 71.1924],
  "Haryana": [29.0588, 76.0856],
  "Himachal Pradesh": [31.1048, 77.1734],
  "Jammu and Kashmir": [33.7782, 76.5762],
  "Jharkhand": [23.6102, 85.2799],
  "Karnataka": [15.3173, 75.7139],
  "Kerala": [10.8505, 76.2711],
  "Ladakh": [34.1526, 77.5771],
  "Lakshadweep": [10.5667, 72.6417],
  "Madhya Pradesh": [22.9734, 78.6569],
  "Maharashtra": [19.7515, 75.7139],
  "Manipur": [24.6637, 93.9063],
  "Meghalaya": [25.467, 91.3662],
  "Mizoram": [23.1645, 92.9376],
  "Nagaland": [26.1584, 94.5624],
  "Odisha": [20.9517, 85.0985],
  "Puducherry": [11.9416, 79.8083],
  "Punjab": [31.1471, 75.3412],
  "Rajasthan": [27.0238, 74.2179],
  "Sikkim": [27.533, 88.5122],
  "Tamil Nadu": [11.1271, 78.6569],
  "Telangana": [18.1124, 79.0193],
  "Tripura": [23.9408, 91.9882],
  "Uttar Pradesh": [26.8467, 80.9462],
  "Uttarakhand": [30.0668, 79.0193],
  "West Bengal": [22.9868, 87.855],
};

export interface PostOfficeDetail {
  name: string;
  branchType?: string;
  deliveryStatus?: string;
  circle?: string;
  district?: string;
  division?: string;
  region?: string;
  block?: string;
  state?: string;
  pincode: string;
}

export interface PincodeLookupResult {
  success: boolean;
  message?: string;
  state?: string;
  district?: string;
  city?: string;
  localities: string[];
  postOffices: PostOfficeDetail[];
}

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

export interface ReverseGeocodeResult {
  latitude: number;
  longitude: number;
  state: string;
  district: string;
  city: string;
  locality: string;
  address: string;
  pincode: string;
}

/**
 * Normalizes state names to match standardized INDIAN_STATES
 */
export function normalizeState(rawState?: string): string {
  if (!rawState) return "";
  const cleaned = rawState.trim().toLowerCase();
  
  if (cleaned.includes("delhi")) return "Delhi";
  if (cleaned.includes("jammu") || cleaned.includes("kashmir")) return "Jammu and Kashmir";
  if (cleaned.includes("andaman") || cleaned.includes("nicobar")) return "Andaman and Nicobar Islands";
  if (cleaned.includes("dadra") || cleaned.includes("daman") || cleaned.includes("diu"))
    return "Dadra and Nagar Haveli and Daman and Diu";
  if (cleaned.includes("puducherry") || cleaned.includes("pondicherry")) return "Puducherry";
  if (cleaned.includes("orissa")) return "Odisha";
  if (cleaned.includes("uttaranchal")) return "Uttarakhand";
  if (cleaned.includes("karnataka") || cleaned.includes("bangalore") || cleaned.includes("bengaluru"))
    return "Karnataka";
  if (cleaned.includes("telangana") || cleaned.includes("hyderabad")) return "Telangana";
  if (cleaned.includes("tamil nadu") || cleaned.includes("chennai")) return "Tamil Nadu";
  if (cleaned.includes("maharashtra") || cleaned.includes("bombay") || cleaned.includes("mumbai") || cleaned.includes("pune"))
    return "Maharashtra";

  const exact = INDIAN_STATES.find(
    (s) => s.toLowerCase() === cleaned || cleaned.includes(s.toLowerCase())
  );
  return exact || rawState.trim();
}

/**
 * Normalizes district names against state's known districts
 */
export function normalizeDistrict(rawDistrict: string, stateName: string): string {
  if (!rawDistrict) return "";
  const districts = STATE_DISTRICTS_MAP[stateName] || [];
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const target = clean(rawDistrict);

  // 1. Exact alphanumeric match (handles "Mahabub Nagar" -> "Mahabubnagar", "Bengaluru Urban" -> "Bangalore Urban", etc.)
  const exact = districts.find((d) => clean(d) === target);
  if (exact) return exact;

  // 2. Common aliases & historical spellings
  const aliases: Record<string, string> = {
    mahabubnagar: "Mahabubnagar",
    mahabubnagarho: "Mahabubnagar",
    mahabubnagardist: "Mahabubnagar",
    bangalore: "Bengaluru Urban",
    bangaloreurban: "Bengaluru Urban",
    bangalorerural: "Bengaluru Rural",
    bengaluru: "Bengaluru Urban",
    bengaluruurban: "Bengaluru Urban",
    bengalururural: "Bengaluru Rural",
    mysore: "Mysuru",
    belgaum: "Belagavi",
    bellary: "Ballari",
    shimoga: "Shivamogga",
    gulbarga: "Kalaburagi",
    bijapur: "Vijayapura",
    chikmagalur: "Chikkamagaluru",
    tumkur: "Tumakuru",
    aurangabad: "Chhatrapati Sambhajinagar",
    osmanabad: "Dharashiv",
    allahabad: "Prayagraj",
    faizabad: "Ayodhya",
    gurgaon: "Gurugram",
    mewat: "Nuh",
    pondicherry: "Puducherry",
    kancheepuram: "Kanchipuram",
    kanniyakumari: "Kanyakumari",
    tuticorin: "Thoothukudi",
    tanjore: "Thanjavur",
    trichy: "Tiruchirappalli",
    cochin: "Ernakulam",
    calicut: "Kozhikode",
    trivandrum: "Thiruvananthapuram",
    palghat: "Palakkad",
    quilon: "Kollam",
    alleppey: "Alappuzha",
    cannannore: "Kannur",
    kadapa: "YSR Kadapa",
    nellore: "Sri Potti Sriramulu Nellore",
    rangareddi: "Rangareddy",
    medchal: "Medchal-Malkajgiri",
    warangalurban: "Hanumakonda",
    warangalrural: "Warangal",
  };

  if (aliases[target]) {
    const aliasMatch = districts.find((d) => clean(d) === clean(aliases[target]));
    if (aliasMatch) return aliasMatch;
  }

  // 3. Substring match
  const partial = districts.find(
    (d) => clean(d).includes(target) || target.includes(clean(d))
  );
  if (partial) return partial;

  // 4. In case the district belongs to another state (e.g. circle mismatch), search all states
  for (const st of Object.keys(STATE_DISTRICTS_MAP)) {
    const found = STATE_DISTRICTS_MAP[st].find((d) => clean(d) === target);
    if (found) return found;
  }

  return rawDistrict.trim();
}

/**
 * Look up Indian Postal PIN code details
 * Uses official Indian Postal PIN code API (api.postalpincode.in)
 */
export async function lookupPincode(pincode: string): Promise<PincodeLookupResult> {
  const cleanPin = pincode.trim();
  if (!/^[1-9][0-9]{5}$/.test(cleanPin)) {
    return {
      success: false,
      message: "Please enter a valid 6-digit PIN code",
      localities: [],
      postOffices: [],
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Postal API responded with status ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0 || data[0].Status !== "Success") {
      return {
        success: false,
        message: data?.[0]?.Message || "No postal records found for this PIN code",
        localities: [],
        postOffices: [],
      };
    }

    const postOffices: PostOfficeDetail[] = (data[0].PostOffice || []).map((po: any) => ({
      name: po.Name,
      branchType: po.BranchType,
      deliveryStatus: po.DeliveryStatus,
      circle: po.Circle,
      district: po.District,
      division: po.Division,
      region: po.Region,
      block: po.Block,
      state: po.State,
      pincode: po.Pincode,
    }));

    const rawState = postOffices[0]?.state || "";
    const rawDistrict = postOffices[0]?.district || "";
    const rawBlock = postOffices[0]?.block || "";

    const standardState = normalizeState(rawState);
    const standardDistrict = normalizeDistrict(rawDistrict, standardState);

    // Collect distinct localities/suburbs from post office names and blocks
    const localityMap = new Map<string, string>();
    const cleanKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

    for (const po of postOffices) {
      if (po.name) {
        // Strip common suffixes like "(Bangalore)" or "S.O" / "B.O" / "H.O"
        const cleanName = po.name
          .replace(/\s*\([^)]*\)/g, "")
          .replace(/\s+(S\.O|B\.O|H\.O|SO|BO|HO)$/i, "")
          .trim();
        const key = cleanKey(cleanName);
        if (cleanName && !localityMap.has(key)) {
          localityMap.set(key, cleanName);
        }
      }
      if (po.block && po.block !== "NA") {
        const cleanBlock = po.block
          .replace(/\s*\([^)]*\)/g, "")
          .replace(/\s+(S\.O|B\.O|H\.O|SO|BO|HO)$/i, "")
          .trim();
        const key = cleanKey(cleanBlock);
        if (cleanBlock && !localityMap.has(key)) {
          localityMap.set(key, cleanBlock);
        }
      }
    }

    // Determine representative city/taluk
    let detectedCity = rawBlock && rawBlock !== "NA" ? rawBlock : standardDistrict;
    detectedCity = detectedCity.replace(/\s+(S\.O|B\.O|H\.O|SO|BO|HO)$/i, "").trim();
    if (detectedCity.toLowerCase().includes("bangalore") || detectedCity.toLowerCase().includes("bengaluru")) {
      detectedCity = "Bangalore";
    }

    const uniqueLocalities = Array.from(localityMap.values());

    return {
      success: true,
      state: standardState,
      district: standardDistrict,
      city: detectedCity,
      localities: uniqueLocalities,
      postOffices,
    };
  } catch (err: any) {
    console.warn("Postal pincode lookup failed or timed out:", err);
    return {
      success: false,
      message: "Network request failed. You may enter details manually.",
      localities: [],
      postOffices: [],
    };
  }
}

/**
 * Geocode an Indian address/location to latitude and longitude
 * Uses OpenStreetMap Nominatim with automatic progressive query fallback
 */
export async function geocodeLocation(options: {
  address?: string;
  locality?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
}): Promise<GeocodeResult | null> {
  const { locality, city, district, state, pincode, address } = options;

  // Progressive search queries in priority order
  const queries: string[] = [];

  if (locality && (city || district) && state) {
    queries.push(`${locality}, ${city || district}, ${state}, India`);
  }
  if (pincode && pincode.length === 6) {
    queries.push(`${pincode}, India`);
  }
  if (locality && city) {
    queries.push(`${locality}, ${city}, India`);
  }
  if (city && state) {
    queries.push(`${city}, ${state}, India`);
  }
  if (district && state) {
    queries.push(`${district}, ${state}, India`);
  }
  if (address && state) {
    queries.push(`${address}, ${state}, India`);
  }
  if (state) {
    queries.push(`${state}, India`);
  }

  for (const query of queries) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&limit=1&q=${encodeURIComponent(
        query
      )}`;
      const res = await fetch(url, {
        headers: {
          "Accept-Language": "en",
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const results = await res.json();
        if (Array.isArray(results) && results.length > 0) {
          const lat = parseFloat(results[0].lat);
          const lon = parseFloat(results[0].lon);
          if (!isNaN(lat) && !isNaN(lon)) {
            return {
              latitude: Number(lat.toFixed(6)),
              longitude: Number(lon.toFixed(6)),
              displayName: results[0].display_name || query,
            };
          }
        }
      }
    } catch {
      // Continue to next query if one fails
    }
  }

  // If external geocoding fails, fallback to state center coordinates
  if (state && STATE_COORDINATES[state]) {
    const [fallbackLat, fallbackLng] = STATE_COORDINATES[state];
    return {
      latitude: fallbackLat,
      longitude: fallbackLng,
      displayName: `${state}, India (Approximate Center)`,
    };
  }

  return null;
}

/**
 * Reverse geocode latitude and longitude to administrative divisions
 */
export async function reverseGeocodeCoordinates(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    const res = await fetch(url, {
      headers: {
        "Accept-Language": "en",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address || {};

    const rawState = addr.state || "";
    const rawDistrict = addr.state_district || addr.county || addr.district || "";
    const rawCity = addr.city || addr.town || addr.village || addr.city_district || "";
    const rawLocality = addr.suburb || addr.neighbourhood || addr.residential || addr.road || "";
    const rawPostcode = addr.postcode || "";

    const standardState = normalizeState(rawState);
    const standardDistrict = normalizeDistrict(rawDistrict, standardState);

    return {
      latitude: Number(lat.toFixed(6)),
      longitude: Number(lng.toFixed(6)),
      state: standardState,
      district: standardDistrict,
      city: rawCity || standardDistrict,
      locality: rawLocality,
      address: data.display_name || "",
      pincode: /^[1-9][0-9]{5}$/.test(rawPostcode) ? rawPostcode : "",
    };
  } catch (err) {
    console.warn("Reverse geocode failed:", err);
    return null;
  }
}

/**
 * Request device location via browser Geolocation API and reverse-geocode it
 */
export async function getCurrentBrowserLocation(): Promise<ReverseGeocodeResult> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const details = await reverseGeocodeCoordinates(latitude, longitude);
        if (details) {
          resolve(details);
        } else {
          resolve({
            latitude: Number(latitude.toFixed(6)),
            longitude: Number(longitude.toFixed(6)),
            state: "",
            district: "",
            city: "",
            locality: "",
            address: "",
            pincode: "",
          });
        }
      },
      (err) => {
        let msg = "Could not fetch current location.";
        if (err.code === 1) msg = "Location permission denied by user.";
        else if (err.code === 2) msg = "Location position unavailable.";
        else if (err.code === 3) msg = "Location request timed out.";
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  });
}
