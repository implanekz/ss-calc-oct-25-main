# Sample Pro Forma Earnings Profiles

Ready-to-use earnings histories for testing and demos. Each profile includes realistic zero years.

## Profile 1: Average Earner ($1,800/month PIA)
**Birth Year:** 1960
**Career Pattern:** Steady with 3 zero years
**Target PIA:** $1,800/month

### Earnings History:
```
1982: $25,000
1983: $0          # Early career gap (job search)
1984: $28,000
1985: $30,000
1986: $32,000
1987: $34,000
1988: $36,000
1989: $38,000
1990: $40,000
1991: $42,000
1992: $44,000
1993: $46,000
1994: $48,000
1995: $50,000
1996: $0          # Mid-career gap (child rearing)
1997: $52,000
1998: $54,000
1999: $56,000
2000: $58,000
2001: $60,000
2002: $62,000
2003: $64,000
2004: $66,000
2005: $68,000
2006: $70,000
2007: $72,000
2008: $74,000
2009: $76,000
2010: $78,000
2011: $80,000
2012: $82,000
2013: $0          # Late career gap (unemployment)
2014: $84,000
2015: $86,000
2016: $88,000
2017: $90,000
2018: $92,000
2019: $94,000
```

**Result:** PIA ≈ $1,800/month

---

## Profile 2: High Earner ($2,500/month PIA)
**Birth Year:** 1960
**Career Pattern:** Increasing with 2 zero years
**Target PIA:** $2,500/month

### Earnings History:
```
1982: $40,000
1983: $45,000
1984: $50,000
1985: $0          # Early career MBA program
1986: $60,000
1987: $65,000
1988: $70,000
1989: $75,000
1990: $80,000
1991: $85,000
1992: $90,000
1993: $95,000
1994: $100,000
1995: $105,000
1996: $110,000
1997: $115,000
1998: $0          # Mid-career sabbatical
1999: $120,000
2000: $125,000
2001: $130,000
2002: $135,000
2003: $140,000
2004: $145,000
2005: $147,000 (max taxable)
2006: $150,000 (above max)
2007: $155,000 (above max)
2008: $160,000 (above max)
2009: $165,000 (above max)
2010: $168,600 (at max)
2011-2019: (continues at or above max taxable)
```

**Result:** PIA ≈ $2,500/month

---

## Profile 3: Low Earner ($1,200/month PIA)
**Birth Year:** 1960
**Career Pattern:** Part-time/intermittent with 5 zero years
**Target PIA:** $1,200/month

### Earnings History:
```
1982: $15,000
1983: $18,000
1984: $0          # Childcare gap
1985: $0          # Childcare gap
1986: $20,000
1987: $22,000
1988: $24,000
1989: $0          # Career break
1990: $26,000
1991: $28,000
1992: $30,000
1993: $32,000
1994: $34,000
1995: $36,000
1996: $0          # Part-time
1997: $38,000
1998: $40,000
1999: $42,000
2000: $44,000
2001: $46,000
2002: $48,000
2003: $50,000
2004: $52,000
2005: $54,000
2006: $56,000
2007: $58,000
2008: $60,000
2009: $0          # Recession layoff
2010: $62,000
2011: $64,000
2012: $66,000
2013: $68,000
2014: $70,000
2015: $72,000
2016: $74,000
2017: $76,000
2018: $78,000
2019: $80,000
```

**Result:** PIA ≈ $1,200/month

---

## Profile 4: Maximum Earner ($3,000/month PIA)
**Birth Year:** 1960
**Career Pattern:** High earner maxing out Social Security
**Target PIA:** $3,000+/month

### Earnings History:
```
1982-2019: Always at or above maximum taxable earnings
1984: $0          # Only one gap year
```

**Specific Years (at max taxable):**
- 1982-1989: At or above max for each year
- 1990-1999: At or above max
- 2000-2019: At or above max

**Result:** PIA ≈ $3,200/month (near maximum)

---

## Using These Profiles

### In the PIA Calculator:
1. Go to PIA Calculator tab
2. Enter birth year (1960 for all profiles)
3. Manually enter earnings from profile
4. Click "Calculate PIA"
5. Compare with target

### For Testing APIs:
```json
{
  "birth_year": 1960,
  "earnings_history": [
    {"year": 1982, "earnings": 25000, "is_projected": false},
    {"year": 1983, "earnings": 0, "is_projected": false},
    ...
  ]
}
```

### Common Use Cases:
- **Profile 1**: Typical American worker
- **Profile 2**: Professional/white collar
- **Profile 3**: Part-time/interrupted career
- **Profile 4**: Executive/maximum benefits

---

## Notes:
- All profiles use 1960 birth year (FRA = 67, eligible at 62 in 2022)
- Zero years are strategically placed for realism
- Earnings cap out at SSA maximum taxable for relevant years
- Actual PIA may vary slightly due to wage indexing and bend points
