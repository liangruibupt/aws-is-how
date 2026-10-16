const PDFDocument = require('pdfkit');
const faker = require('faker');
const getStream = require('get-stream');

exports.lambdaHandler = async (event) => {

    const doc = new PDFDocument();

    const randomName = faker.name.findName();

    doc.text(randomName, { align: 'right' });
    doc.text(faker.address.streetAddress(), { align: 'right' });
    doc.text(faker.address.secondaryAddress(), { align: 'right' });
    doc.text(faker.address.zipCode() + ' ' + faker.address.city(), { align: 'right' });
    doc.moveDown();
    doc.text('Dear ' + randomName + ',');
    doc.moveDown();
    for(let i = 0; i < 3; i++) {
        doc.text(faker.lorem.paragraph());
        doc.moveDown();
    }
    doc.text(faker.name.findName(), { align: 'right' });
    doc.end();

    pdfBuffer = await getStream.buffer(doc);
    pdfBase64 = pdfBuffer.toString('base64');

    const response = {
        statusCode: 200,
        headers: {
            'Content-Length': Buffer.byteLength(pdfBase64),
            'Content-Type': 'application/pdf',
            'Content-disposition': 'attachment;filename=test.pdf'
        },
        isBase64Encoded: true,
        body: pdfBase64
    };
    return response;
};