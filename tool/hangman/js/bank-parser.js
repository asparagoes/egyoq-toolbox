// Shared by the browser loader and the parser tests. No uploaded content is executed.
(function(root){
  function parseBank(text){
    const entries = [];
    const errors = [];
    String(text).replace(/^\uFEFF/, "").split(/\r\n|\n|\r/).forEach((raw, index) => {
      const line = raw.trim();
      if(!line || line.startsWith('#')) return;
      const fields = line.split('|').map(field => field.trim());
      const answer = fields[0].replace(/\s+/g, ' ').toUpperCase();
      let error = '';
      if(fields.length > 4) error = 'Use at most four fields separated by |.';
      else if(!answer || !/[A-Z]/.test(answer)) error = 'The answer needs at least one A–Z letter.';
      else if(!/^[A-Z0-9 \x21-\x7E]+$/.test(answer)) error = 'Use A–Z letters, spaces, numbers and basic punctuation in answers.';
      else if(answer.length > 80) error = 'Keep answers to 80 characters or fewer.';
      else if(fields.length > 1 && !fields[1]) error = 'Add a question or clue after |, or use just the answer.';
      else if(fields.some(field => field.length > 1000)) error = 'Keep each clue, bonus and category to 1,000 characters or fewer.';
      if(error){ errors.push(`Line ${index + 1}: ${error}`); return; }
      entries.push({
        round: Math.floor(entries.length / 5) + 1,
        answer,
        clue: fields[1] || 'Guess the word or phrase.',
        bonus: fields[2] || 'Explain the answer or use it in a sentence.',
        category: fields[3] || 'Custom bank'
      });
    });
    if(errors.length) throw new Error(errors.slice(0, 5).join('\n') + (errors.length > 5 ? `\n…and ${errors.length - 5} more invalid lines.` : ''));
    if(!entries.length) throw new Error('No entries found. Add ANSWER | Question or clue, one per line.');
    if(entries.length > 500) throw new Error('Use 500 entries or fewer per bank.');
    return entries;
  }
  if(typeof module !== 'undefined' && module.exports) module.exports = { parseBank };
  else root.HangmanBank = { parseBank };
})(globalThis);
