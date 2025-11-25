const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Delete existing crossword clues
  await prisma.crossword_Clue.deleteMany({
    where: { game_id: 3 }
  });

  // Insert 8 crossword clues
  const clues = [
    { game_id: 3, question: 'Proses bulanan pada perempuan', answer: 'MENSTRUASI', row: 3, col: 1, direction: 'across' },
    { game_id: 3, question: 'Virus penyebab kanker serviks', answer: 'HPV', row: 6, col: 1, direction: 'across' },
    { game_id: 3, question: 'Bagian bawah rahim', answer: 'SERVIKS', row: 9, col: 0, direction: 'across' },
    { game_id: 3, question: 'Infeksi Menular Seksual', answer: 'IMS', row: 5, col: 8, direction: 'across' },
    { game_id: 3, question: 'Penyakit yang melemahkan imun', answer: 'AIDS', row: 1, col: 9, direction: 'down' },
    { game_id: 3, question: 'Akhir masa menstruasi', answer: 'MENOPAUSE', row: 1, col: 1, direction: 'across' },
    { game_id: 3, question: 'Hormon reproduksi perempuan', answer: 'ESTROGEN', row: 0, col: 4, direction: 'down' },
    { game_id: 3, question: 'Tempat berkembang janin', answer: 'RAHIM', row: 1, col: 7, direction: 'down' }
  ];

  for (const clue of clues) {
    await prisma.crossword_Clue.create({ data: clue });
  }

  console.log('✅ Crossword clues seeded successfully');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
