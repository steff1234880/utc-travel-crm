const Decimal = require('decimal.js');

const revenueBreakdown = {
  PACKAGE: new Decimal(0),
  BOOKING_SERVICE: new Decimal(0),
  CUSTOMIZED_TOUR: new Decimal(0),
  OTHER_SERVICE: new Decimal(0)
};

const r = { revenueType: 'OTHER_SERVICE', amount: 1000 };
const amt = new Decimal(r.amount);

if (r.revenueType in revenueBreakdown) {
  revenueBreakdown[r.revenueType] = revenueBreakdown[r.revenueType].plus(amt);
}

console.log(revenueBreakdown.OTHER_SERVICE.toNumber());
