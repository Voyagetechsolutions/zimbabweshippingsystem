# Feature Status: England vs Ireland - Side by Side

## Current Implementation Status

| Feature | England (UK) | Ireland | Notes |
|---------|:------------:|:-------:|-------|
| **Routes Tab** |
| View routes | ✅ | ✅ | Both filter by country |
| Add single route | ✅ | ✅ | Manual entry |
| Add all routes (seed) | ✅ NEW | ✅ | One-click seed all routes |
| Edit route | ✅ | ✅ | Update areas/postcodes |
| Delete route | ✅ | ✅ | With confirmation |
| **Route Data** |
| Route names | 10 routes | 7 routes | Stored in DB |
| Areas/Cities | ✅ | ✅ | Stored in `areas[]` |
| Postcodes | ✅ (UK only) | N/A | Ireland doesn't use postcodes |
| **Collection Schedule Tab** |
| Calendar view | ✅ FIXED | ✅ FIXED | Date parsing now works |
| Set pickup date | ✅ | ✅ | Date picker |
| View by country | ✅ | ✅ | Country filter |
| Click day to schedule | ✅ | ✅ | Interactive calendar |
| View bookings for date | ✅ | ✅ | Shows shipments |
| **Booking Form (Customer)** |
| Route detection | By postcode | By city | Auto-detects route |
| Collection date display | ✅ | ✅ | Fetched from DB |
| City autocomplete | N/A | ✅ | Ireland cities dropdown |
| Postcode validation | ✅ | N/A | UK postcode format |
| **Pickup Zones Tab** |
| View routes | ✅ | ✅ | Card-based UI |
| View pickups per route | ✅ | ✅ | Shipment count |
| Schedule pickups | ✅ | ✅ | Set date |
| Mark as collected | ✅ | ✅ | Status update |
| Export pickup list | ✅ | ✅ | CSV download |
| **Customer Management** |
| View customers | ✅ | ✅ | By email/phone |
| View bookings | ✅ | ✅ | Linked to customer |
| Search | ✅ | ✅ | Name/email/phone |

## Routes Data

### England Routes (10)
| Route | Cities | Postcodes |
|-------|--------|-----------|
| LONDON | Central/East/West/North/South London | EC, WC, N, NW, E, SE, SW, W, EN, IG, RM, DA, BR, UB, HA, WD |
| BIRMINGHAM | Birmingham, Coventry, Wolverhampton, Dudley, Walsall, Worcester, Shrewsbury, Telford | B, CV, WV, DY, WS, WR, SY, TF |
| MANCHESTER | Manchester, Liverpool, Warrington, Oldham, Stockport, Stoke, Blackburn, Preston, Blackpool, Bolton, Wigan, Crewe, Chester | M, L, WA, OL, SK, ST, BB, PR, FY, BL, WN, CW, CH, LL |
| LEEDS | Leeds, Wakefield, Halifax, Doncaster, Sheffield, Huddersfield, York, Bradford, Harrogate | LS, WF, HX, DN, S, HD, YO, BD, HG |
| CARDIFF | Cardiff, Gloucester, Bristol, Swindon, Bath, Salisbury, Newport, Swansea | CF, GL, BS, SN, BA, SP, NP, SA |
| BOURNEMOUTH | Southampton, Portsmouth, Reading, Guildford, Bournemouth, Oxford | SO, PO, RG, GU, BH, OX |
| NOTTINGHAM | Nottingham, Leicester, Derby, Peterborough, Lincoln | NG, LE, DE, PE, LN |
| BRIGHTON | Brighton, Redhill, Slough, Tunbridge Wells, Canterbury, Croydon, Twickenham, Kingston, Maidstone | BN, RH, SL, TN, CT, CR, TW, KT, ME |
| SOUTHEND | Norwich, Ipswich, Colchester, Chelmsford, Cambridge, Southend, Stevenage | NR, IP, CO, CM, CB, SS, SG |
| NORTHAMPTON | Milton Keynes, Luton, St Albans, Hemel Hempstead, Northampton | MK, LU, AL, HP, NN |

### Ireland Routes (7)
| Route | Cities |
|-------|--------|
| LONDONDERRY | Larne, Ballyclare, Ballymena, Ballymoney, Kilrea, Coleraine, Londonderry, Lifford, Omagh, Cookstown, Carrickfergus |
| BELFAST | Belfast, Bangor, Comber, Lisburn, Newry, Newtownwards, Dunmurry, Lurgan, Portadown, Banbridge, Moy, Dungannon, Armagh |
| CAVAN | Maynooth, Ashbourne, Swords, Skerries, Drogheda, Dundalk, Cavan, Virginia, Kells, Navan, Trim |
| ATHLONE | Mullingar, Longford, Roscommon, Boyle, Sligo, Ballina, Swinford, Castlebar, Tuam, Galway, Athenry, Athlone |
| LIMERICK | Newbridge, Portlaoise, Roscrea, Limerick, Ennis, Doolin, Loughrea, Ballinasloe, Tullamore |
| DUBLIN CITY | Sandyford, Rialto, Ballymount, Cabra, Beaumont, Malahide, Portmarnock, Dalkey, Shankill, Bray, Dublin |
| CORK | Cashel, Fermoy, Cork, Dungarvan, Waterford, New Ross, Wexford, Gorey, Greystones |

## How to Set Up

### Step 1: Add Routes to Database
1. Go to **Admin Dashboard** → **Routes** tab
2. Select country (UK or Ireland flag)
3. Click **"Add All UK Routes"** or **"Add All Ireland Routes"**
4. Routes will be added with `country` field set correctly

### Step 2: Set Collection Dates
1. Go to **Collection Schedule** tab
2. Click on a day in the calendar
3. Select a route to schedule
4. Or click an existing route to change its date

### Step 3: Verify in Booking Form
1. Go to customer booking form
2. For UK: Enter postcode (e.g., "SW1 1AA") → Detects LONDON route
3. For Ireland: Select city (e.g., "Dublin") → Detects DUBLIN CITY route
4. Collection date shows from database

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     ADMIN DASHBOARD                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Routes Tab                    Collection Schedule Tab           │
│  ┌────────────────┐           ┌────────────────────────┐        │
│  │ Add UK Routes  │──────────▶│ Calendar View          │        │
│  │ Add IE Routes  │           │ - Click day to schedule│        │
│  │ Edit/Delete    │           │ - Set pickup dates     │        │
│  └───────┬────────┘           └──────────┬─────────────┘        │
│          │                               │                       │
│          ▼                               ▼                       │
│  ┌───────────────────────────────────────────────────┐          │
│  │           collection_schedules TABLE              │          │
│  │  - route (LONDON, DUBLIN CITY, etc.)             │          │
│  │  - areas[] (cities + postcodes)                   │          │
│  │  - pickup_date ("March 25th, 2026")              │          │
│  │  - country (England/Ireland)                      │          │
│  └───────────────────────────────────────────────────┘          │
│                              │                                   │
└──────────────────────────────┼───────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CUSTOMER BOOKING FORM                        │
├─────────────────────────────────────────────────────────────────┤
│  UK Flow:                    Ireland Flow:                       │
│  1. Enter postcode           1. Select city from dropdown        │
│  2. postalCodeUtils detects  2. postalCodeUtils detects          │
│     route from postcodes        route from city name             │
│  3. Fetch pickup_date        3. Fetch pickup_date                │
│  4. Display collection date  4. Display collection date          │
└─────────────────────────────────────────────────────────────────┘
```

## Recent Fixes Applied

1. **Calendar Date Parsing** - Fixed parsing of dates like "March 25th, 2026"
2. **Country Filtering** - Routes without `country` field default to England
3. **Seed Buttons** - One-click to add all UK or Ireland routes
4. **Customer Matching** - Now uses email/phone instead of user_id
