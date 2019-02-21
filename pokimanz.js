const damage = (level, atk, def, mvpow, mods = []) => {
  const l = (((2 * level) / 5) + 2)|0;
  const ad = ((l * mvpow * atk) / def)|0;
  const base = ((ad / 50) + 2)|0;
  // return base;
  // return (base * mod)|0;
  return mods.reduce(
    (current, mod) => (current * mod)|0,
    base
  );
};

const stat = (level, base) =>
	(2 * base * level / 100)|0 + 205;

// console.log(damage(75, 123, 163, 65, [0.85, 2]));
const compare = (base, pow) => damage(
  pow,
  stat(75, base),
  125,
  pow,
  [1.5, 0.85, 2]
);

const tests = [
  95, 109
];

const power = 90;
for (const test of tests) {
  console.log(compare(test, power));
}
