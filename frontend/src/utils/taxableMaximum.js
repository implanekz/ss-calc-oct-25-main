// SSA taxable maximum (maximum earnings subject to Social Security payroll tax)
// Source: SSA historical taxable maximum table (updated 2025)
export const TAXABLE_MAXIMUM_BY_YEAR = {
    2025: 176100,
    2024: 168600,
    2023: 160200,
    2022: 147000,
    2021: 142800,
    2020: 137700,
    2019: 132900,
    2018: 128400,
    2017: 127200,
    2016: 118500,
    2015: 118500,
    2014: 117000,
    2013: 113700,
    2012: 110100,
    2011: 106800,
    2010: 106800,
    2009: 106800,
    2008: 102000,
    2007: 97500,
    2006: 94200,
    2005: 90000,
    2004: 87900,
    2003: 87000,
    2002: 84900,
    2001: 80400,
    2000: 76200,
    1999: 72600,
    1998: 68400,
    1997: 65400,
    1996: 62700,
    1995: 61200,
    1994: 60600,
    1993: 57600,
    1992: 55500,
    1991: 53400,
    1990: 51300,
    1989: 48000,
    1988: 45000,
    1987: 43800,
    1986: 42000,
    1985: 39600,
    1984: 37800,
    1983: 35700,
    1982: 32400,
    1981: 29700,
    1980: 25900
};

export const getTaxableMaximum = (year) => {
    if (TAXABLE_MAXIMUM_BY_YEAR[year]) {
        return TAXABLE_MAXIMUM_BY_YEAR[year];
    }
    const latestYear = Math.max(...Object.keys(TAXABLE_MAXIMUM_BY_YEAR).map(Number));
    return TAXABLE_MAXIMUM_BY_YEAR[latestYear];
};
