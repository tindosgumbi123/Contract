import React from 'react';
import jsPDF from 'jspdf';
import { Session } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { format } from 'date-fns';
import logoUrl from '@assets/Logo_Registered_.jpg_1784563137893.jpeg';

// ─── Brand colours ───────────────────────────────────────────────────────────
const NAVY   = [13, 35, 80]   as const;  // #0d2350
const YELLOW = [245, 197, 24] as const;  // #F5C518
const GREY   = [100, 116, 139] as const; // slate-500
const DARK   = [30, 41, 59]   as const;  // near-black body text
const WHITE  = [255, 255, 255] as const;
// ─────────────────────────────────────────────────────────────────────────────

interface PdfGeneratorProps {
  session: Session;
  type: 'employment_contract' | 'formal_offer';
}

export function PdfGenerator({ session, type }: PdfGeneratorProps) {
  const isEmploymentContract = type === 'employment_contract';

  const generatePdf = async () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const PW = doc.internal.pageSize.getWidth();   // 210 mm
    const PH = doc.internal.pageSize.getHeight();  // 297 mm
    const M  = 20;   // side margin
    const FOOTER_H = 14;
    const HEADER_H = 32;
    const CONTENT_BOTTOM = PH - FOOTER_H - 12;  // safe bottom boundary for content
    const BODY_W = PW - M * 2;
    let Y = M;

    // ── Helpers ────────────────────────────────────────────────────────────────
    const safe = (v?: string | null) => v?.trim() || '____________________';

    const setFill  = (c: readonly [number,number,number]) => doc.setFillColor(c[0], c[1], c[2]);
    const setStroke= (c: readonly [number,number,number]) => doc.setDrawColor(c[0], c[1], c[2]);
    const setColor = (c: readonly [number,number,number]) => doc.setTextColor(c[0], c[1], c[2]);

    const needPage = (h: number) => {
      if (Y + h > CONTENT_BOTTOM) {
        footer();
        doc.addPage();
        pageNum++;
        Y = HEADER_H + 10;
        header();
      }
    };

    // ── Logo ───────────────────────────────────────────────────────────────────
    let logoB64: string | null = null;
    try {
      const res  = await fetch(logoUrl);
      const blob = await res.blob();
      logoB64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onloadend = () => resolve(r.result as string);
        r.onerror   = reject;
        r.readAsDataURL(blob);
      });
    } catch {}

    // ── Page counter ──────────────────────────────────────────────────────────
    let pageNum = 1;

    // ── Footer ────────────────────────────────────────────────────────────────
    const footer = () => {
      const fy = PH - FOOTER_H;

      // Full yellow background
      setFill(YELLOW);
      doc.rect(0, fy, PW, FOOTER_H, 'F');

      // Navy left block (wide enough for clinic name)
      const navyW = 78;
      setFill(NAVY);
      doc.rect(0, fy, navyW, FOOTER_H, 'F');

      // White text on navy — clinic name
      setColor(WHITE);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text('DUNWELL YOUTH PRIORITY CLINIC', 5, fy + 5.5);

      // White text on navy — confidential label
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.text('CONFIDENTIAL DOCUMENT', 5, fy + 10);

      // Page number on yellow — navy text, right-aligned
      setColor(NAVY);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(`${pageNum}`, PW - 8, fy + 8.5, { align: 'right' });
    };

    // ── Header (runs on every page) ───────────────────────────────────────────
    const header = () => {
      // Navy background bar
      setFill(NAVY);
      doc.rect(0, 0, PW, HEADER_H, 'F');

      // Yellow left accent stripe
      setFill(YELLOW);
      doc.rect(0, 0, 5, HEADER_H, 'F');

      // Logo
      if (logoB64) {
        doc.addImage(logoB64, 'JPEG', 9, 2, 26, 26);
      }

      // Clinic name
      setColor(WHITE);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('DUNWELL YOUTH PRIORITY CLINIC', 40, 11);

      setColor(YELLOW);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text('Executive Healthcare and Wellness  |  Johannesburg, South Africa', 40, 17);

      // Thin yellow underline at bottom of header
      setStroke(YELLOW);
      doc.setLineWidth(0.6);
      doc.line(0, HEADER_H, PW, HEADER_H);

      Y = HEADER_H + 10;
      setColor(DARK);
    };

    // ── Section heading ───────────────────────────────────────────────────────
    const section = (text: string) => {
      // Ensure section header + at least one line of content fit before starting
      needPage(22);
      setFill(NAVY);
      doc.roundedRect(M, Y, BODY_W, 7.5, 1.5, 1.5, 'F');
      setColor(WHITE);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(text.toUpperCase(), M + 4, Y + 5.2);
      Y += 10;
      setColor(DARK);
    };

    // ── Body text helpers ─────────────────────────────────────────────────────
    const line = (text: string, size = 9.5, bold = false, indent = 0) => {
      needPage(size * 0.6 + 4);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(size);
      setColor(DARK);
      doc.text(text, M + indent, Y);
      Y += size * 0.45 + 1.5;
    };

    const para = (text: string, size = 9.5, bold = false, indent = 0) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(size);
      setColor(DARK);
      const lines = doc.splitTextToSize(text, BODY_W - indent);
      lines.forEach((l: string) => {
        needPage(size * 0.6 + 3);
        doc.text(l, M + indent, Y);
        Y += size * 0.45 + 1.2;
      });
    };

    const bullet = (text: string) => para(`\u2022  ${text}`, 9.5, false, 4);

    const gap = (mm = 4) => { Y += mm; };

    // ── Signature block ───────────────────────────────────────────────────────
    const sigBlock = (
      label: string,
      sigB64?: string | null,
      sigDate?: string | null,
      signerName?: string | null,
      x: number = M,
      w: number = 78
    ) => {
      needPage(44);
      // label
      setColor(NAVY);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(label.toUpperCase(), x, Y);
      Y += 3;

      // signature image or blank space
      if (sigB64) {
        try { doc.addImage(sigB64, 'PNG', x, Y, w * 0.7, 16); } catch {}
      }

      // dashed signature line
      setStroke(GREY);
      doc.setLineWidth(0.3);
      doc.setLineDashPattern([1.5, 1.5], 0);
      doc.line(x, Y + 18, x + w, Y + 18);
      doc.setLineDashPattern([], 0);

      Y += 21;

      // name and date below line
      setColor(DARK);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      if (signerName && signerName !== '____________________') {
        doc.text(`Name: ${signerName}`, x, Y);
        Y += 5;
      }
      if (sigDate) {
        // Parse the date — could be ISO string or "YYYY-MM-DD"
        let parsedDate: Date;
        try {
          parsedDate = new Date(sigDate);
        } catch {
          parsedDate = new Date();
        }
        setColor(NAVY);
        doc.setFont('helvetica', 'bold');
        doc.text(`Date: ${format(parsedDate, 'dd MMMM yyyy')}`, x, Y);
        setColor(DARK);
        doc.setFont('helvetica', 'normal');
      } else {
        doc.text(`Date: _____ / _____ / _______`, x, Y);
      }
      Y += 7;
    };

    // ── Side-by-side signature blocks ─────────────────────────────────────────
    const sigRow = (
      leftLabel: string, leftSig?: string | null, leftDate?: string | null, leftName?: string | null,
      rightLabel: string = '', rightSig?: string | null, rightDate?: string | null, rightName?: string | null
    ) => {
      needPage(54);
      const half = (BODY_W - 10) / 2;
      const savedY = Y;
      sigBlock(leftLabel,  leftSig,  leftDate,  leftName,  M,          half);
      const leftEnd = Y;
      Y = savedY;
      sigBlock(rightLabel, rightSig, rightDate, rightName, M + half + 10, half);
      Y = Math.max(leftEnd, Y);
    };

    // ── "Signed at" line ──────────────────────────────────────────────────────
    // Uses the letter date selected for the contract, not the signature timestamp
    const signedAtLine = () => {
      const letterDateStr = session.letterDate;
      let sd: Date | null = null;
      if (letterDateStr) {
        try {
          // Parse as local date to avoid UTC timezone shift
          sd = new Date(`${letterDateStr}T12:00:00`);
        } catch {}
      }
      const day   = sd ? format(sd, 'd')    : '_______';
      const month = sd ? format(sd, 'MMMM') : '______________';
      const year  = sd ? format(sd, 'yyyy') : '202____';
      const loc   = safe(session.placeOfWork) !== '____________________' ? safe(session.placeOfWork) : 'Dunwell Clinic';
      para(`Signed at ${loc} on this ${day} day of ${month} ${year}.`, 9.5);
    };

    // ══════════════════════════════════════════════════════════════════════════
    //  FIRST PAGE
    // ══════════════════════════════════════════════════════════════════════════
    header();

    if (isEmploymentContract) {
      // ─── Title ──────────────────────────────────────────────────────────────
      setColor(NAVY);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('EMPLOYMENT CONTRACT', PW / 2, Y, { align: 'center' });

      // Yellow underline beneath title
      setStroke(YELLOW);
      doc.setLineWidth(1);
      const tw = doc.getStringUnitWidth('EMPLOYMENT CONTRACT') * 14 / doc.internal.scaleFactor;
      doc.line(PW / 2 - tw / 2, Y + 1.5, PW / 2 + tw / 2, Y + 1.5);
      setColor(DARK);
      Y += 10;

      // ─── Employee block ─────────────────────────────────────────────────────
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      setColor(NAVY);
      doc.text(safe(session.employeeName), M, Y);
      Y += 5;
      setColor(DARK);
      para(safe(session.employeeAddress), 9.5);
      gap(2);
      setColor(GREY);
      line(safe(session.letterDate), 9);
      setColor(DARK);
      gap(6);

      para(`Dear ${safe(session.employeeName)},`);
      gap(3);
      para(`We have pleasure in confirming our offer of ${safe(session.employmentStatus)} employment with DUNWELL EXECUTIVE HEALTHCARE AND WELLNESS (herein referred to as "DEHW") in the position of ${safe(session.position)}, commencing on ${safe(session.startDate)}. This position is ${safe(session.employmentStatus)} and ongoing, subject to the terms and conditions outlined in this employment contract. This contract is subject to a favourable report on verification of your Personal Credentials.`);
      gap(3);
      para('The terms and conditions of such employment are set out below:');
      bullet(`You will be reporting to the ${safe(session.supervisor)}`);
      bullet('You will have no expectation, nor does the employer create any expectation that your contract would be extended past the above-mentioned fixed period. No additional discharge benefits, severance and/or related payments will be due on termination.');
      bullet('You shall be bound by the terms and conditions of service as stated in the DEHW Program Policy & Procedure Manual and the Employee handbook (hereafter referred to as "the Manual") which serves as the official policy documents setting out the rules and regulations.');
      gap(4);

      section('ARTICLE 1: JOB DESCRIPTION AND EMPLOYMENT DUTIES');
      para(`Your roles and responsibilities are outlined in your job description. Your job description will be fully discussed with you by the ${safe(session.supervisor)} to whom you report. Please feel free to seek clarification pertaining to your role and responsibilities during that time. You undertake to:`);
      bullet('Carry out all such functions and duties as are, from time to time, assigned to you and as are reasonable or lawful, including those set out in your job description;');
      bullet('Obey and comply with all lawful and reasonable instructions given to you by your superior;');
      bullet('Be loyal to DEHW in all dealings and transactions relating to the business and interests of DEHW and to use your best abilities to protect and promote the business, reputation and goodwill of DEHW;');
      bullet('Submit to the management, or to any person nominated by management, such information and reports as may be required of you in connection with the performance of your duties and the business of DEHW;');
      bullet('Devote the whole of your time and attention during DEHW working hours, and such additional time as the exigencies of DEHW business may require, to the business affairs of DEHW and to your duties in terms of your employment with DEHW.');
      gap(4);

      section('ARTICLE 2: REMUNERATION');
      para(`Your remuneration shall consist of a gross consolidated salary of ${safe(session.annualSalary)} per annum; or ${safe(session.monthlySalary)} per month.`);
      para('Any and all wages earned are subject to statutory deductions, as required by the government and/or any other amounts owing to DEHW for any reason. The deductions will be reflected on your pay slip. Your remuneration shall be paid by the LAST DAY of every month, but not later than the 1st of the month into your personal bank account, which particulars should be provided to and verified with our Finance department.');
      gap(4);

      section('ARTICLE 3: OTHER BENEFITS');
      para('DEHW reserves the right to offer additional benefits, both company paid, and employee paid or both. Should any employee elect said benefits, the employee thereby agrees to any deductions required to cover the employee contribution and to abide by the terms and conditions of the program, plan, or scheme. The employee shall understand that some benefits may require election within a specified period of time and failure to comply with deadlines may forfeit the ability to elect such benefits at a later date.');
      gap(4);

      section('ARTICLE 4: HOURS OF WORK');
      para('Your ordinary hours of work shall be from 09:00 to 17:00, Monday to Friday, 09:00 to 13:00 Sat & PH. However, DEHW reserves the right to have the employee work for 45 hours weekly if deemed necessary per the terms of the Basic Conditions Employment Act (BCEA). Employees are entitled to a 1hr meal interval for each day worked.');
      para("You agree to work overtime, in addition to a 45-hour workweek, as may be necessary for DEHW's business. You will be compensated for any overtime in accordance to legal requirements, specifically the Basic Conditions Employment Act (BCEA).");
      gap(4);

      section('ARTICLE 5: PERIOD OF PROBATION');
      para('For all new employees, your appointment is subject to a three (3) month probation period. During this probation period parties on both sides are required to give notice according to the requirements in Article 7.');
      gap(4);

      section('ARTICLE 6: TERMINATION NOTICE');
      para('The parties may terminate this contract by giving written notice as follows:');
      bullet('1 (one) week during the first 6 (six) months of employment.');
      bullet('2 (two) weeks if the employee has been employed for more than 6 months, but no longer than 1 year.');
      bullet("1 calendar months' notice if employee has worked for more than 1 year or payment in lieu thereof.");
      para('DEWH can also terminate the contract at any time, should the Employee be found in violation of policies and/or procedures.');
      gap(4);

      section('ARTICLE 7: PLACE OF WORK');
      para(`Your place of work is situated at ${safe(session.placeOfWork)} if and when required, you may be called upon to attend meetings / conferences and congresses off the premises.`);
      gap(4);

      section('ARTICLE 8: ANNUAL LEAVE');
      para('You shall be entitled to take a maximum of 21 working days leave per year. Leave shall be taken at a time, or times, convenient to DEHW, within six months of the completion of the applicable leave cycle. DEHW leave policy states that no more than 5 (five) days can be carried over every year to the next cycle. Upon termination of your employment, you shall be entitled to be paid out in respect of any accrued leave not yet taken prior to the termination of your employment. Leave application forms shall be submitted within a reasonable time prior to taking leave.');
      gap(4);

      section('ARTICLE 9: SICK LEAVE');
      para('You shall be entitled to 30 working days sick leave over a 3-year period, with 10 days paid sick leave only, in the first year of your employment. Any further paid sick leave may be given at the discretion of DEHW management only. Should you be absent for 2 consecutive days or more, or on a Monday or Friday, you will be required to produce a medical certificate or doctor\'s letter, in order to qualify for paid sick leave.');
      para('Should you, at any time, become permanently unable, in the reasonable opinion of DEHW management, to perform your duties adequately by reason of ill health, DEHW shall be entitled to terminate your employment on such terms as DEHW, in its discretion, considers reasonable.');
      gap(4);

      section('ARTICLE 10: COMPASSIONATE LEAVE');
      para('Up to a maximum of 3 working days per annum shall be allowed as compassionate leave for the purpose of attending to emergencies such as death or critical sickness of family members and other relations. Compassionate leave is subject to agreement with and approval of your line manager.');
      gap(4);

      section('ARTICLE 11: MATERNITY LEAVE & PATERNITY LEAVE');
      para('Maternity leave shall be allowed at the rate of 90 days (3 calendar months). Maternity leave may be taken from TWO weeks before the expected delivery date. DEHW will compensate the employee 50% paid maternity leave for the first three months ONLY.');
      para("An employee who is a parent of a child will be entitled to 10 consecutive days' parental leave. This will effectively replace the three days' paternity leave currently provided for in the BCEA. Parental leave may commence on the day the child is born.");
      gap(4);

      section('ARTICLE 12: CONFIDENTIALITY');
      para("You agree not to use, for your own benefit or for the benefit of any other person, and not to disclose to any third party, except in the ordinary and proper course of DEHW's business, any confidential information of DEHW; either while this agreement is in operation or after its termination.");
      gap(4);

      section('ARTICLE 13: RESTRAINTS');
      para('The employee undertakes and agrees that during the period of employment he/she shall not, without prior written consent from the employer, which consent shall not be unreasonably withheld:');
      bullet('Accept any position of employment with another employer;');
      bullet('Incur any liability or debt or enter into any contract on behalf of the employer;');
      bullet('Disclose or divulge or communicate to any person not authorised to receive the information, any information belonging to the employer and/or relating to the employer\'s affairs or the affairs of any client or business associate of the employer;');
      bullet('The rights to any project of any nature developed during the course of employment. The employee has no claim to any benefit from such project other than, when granted by the employer in writing.');
      gap(4);

      section('ARTICLE 14: DISCIPLINARY, GRIEVANCE AND RETRENCHMENT PROCEDURES');
      para('You will be bound by the disciplinary, grievance, and retrenchment procedures determined and communicated by DEHW from time to time.');
      gap(4);

      section('ARTICLE 15: RETURN OF ASSETS AND RECORDS ON TERMINATION');
      para('On termination of your employment, you shall immediately deliver to DEHW all assets, records, documents, accounts, letters, notes, memoranda and papers of every description within your possession or control, relating to the affairs and business of DEHW, whether or not they were originally supplied by DEHW.');
      gap(4);

      section('ARTICLE 16: GENERAL PROVISIONS');
      para("No indulgence granted by a party shall constitute a waiver of any of that party's rights under this agreement; accordingly, that party shall not be precluded as a consequence of having granted such indulgence, from exercising any rights against the other which may have arisen in the past or which may arise in the future.");
      bullet('No agreement varying, adding to, deleting from or cancelling this agreement, shall be effective unless produced to writing and signed by, or on behalf of, the parties;');
      bullet('This agreement, subject to clause below, and as read with the disciplinary, grievance and retrenchment procedures laid down by DEHW from time to time, shall constitute the entire contract between the parties with regard to the matters dealt with in this agreement, and no representations, terms, conditions or warranties not contained in this agreement shall be binding on the parties;');
      bullet('This agreement and the disciplinary, grievance and retrenchment procedures as laid down by DEHW from time to time, shall at all times be subject to the provisions of the Labour Relations Act, No. R66 of 1995 as amended and any other law applicable at the time, including the Basic conditions of Employment Act No. 75 of 1997.');
      bullet('You hereby expressly give DEHW permission to intercept, monitor, access, read, block or act upon any of your electronic communications including but not limited to e-mail correspondence, computer files stored on the computer or on your network or any storage device owned by DEHW including internal telephone/telefax transmissions.');
      gap(8);

      para('We take pleasure in welcoming you to the DEHW team and look forward to working with you. We hope that our relationship will be mutually rewarding.');
      gap(5);
      para('Yours sincerely,');
      gap(12);

      // ─── Recommended / Approved signatures ──────────────────────────────────
      needPage(65);
      setColor(NAVY);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('RECOMMENDED:', M, Y);
      Y += 6;
      sigBlock('Project Manager', session.projectManagerSignature, session.projectManagerSignedAt, (session as any).projectManagerName || undefined, M, 80);
      gap(4);
      setColor(NAVY);
      doc.setFont('helvetica', 'bold');
      doc.text('APPROVED:', M, Y);
      Y += 6;
      sigBlock('Director', session.directorSignature, session.directorSignedAt, undefined, M, 80);

      footer();

      // ─── Acceptance page ─────────────────────────────────────────────────────
      doc.addPage();
      pageNum++;
      Y = HEADER_H + 10;
      header();

      // Acceptance banner
      setFill(NAVY);
      doc.rect(M, Y, BODY_W, 10, 'F');
      setColor(YELLOW);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('ACCEPTANCE CLAUSE', PW / 2, Y + 7, { align: 'center' });
      Y += 16;
      setColor(DARK);

      para('I hereby accept and understand the conditions of employment as set out in this offer of fixed term employment. I confirm and accept that the contents of this letter have been explained to me, that the contents are fair and reasonable and agree to abide by the terms of this offer.');
      gap(6);

      // Signing date line — uses the letter date
      setColor(GREY);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9.5);
      signedAtLine();
      setColor(DARK);
      doc.setFont('helvetica', 'normal');
      gap(8);

      // Employee + Witness side by side
      sigRow(
        'Employee', session.employeeSignature, session.employeeSignedAt, safe(session.employeeName),
        'Witness',  session.witnessSignature,  session.witnessSignedAt,  session.witnessName || undefined
      );

      footer();

    } else {
      // ══════════════════════════════════════════════════════════════════════════
      //  FORMAL OFFER OF EMPLOYMENT
      // ══════════════════════════════════════════════════════════════════════════

      // Title
      setColor(NAVY);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('FORMAL OFFER OF EMPLOYMENT', PW / 2, Y, { align: 'center' });
      const tw2 = doc.getStringUnitWidth('FORMAL OFFER OF EMPLOYMENT') * 14 / doc.internal.scaleFactor;
      setStroke(YELLOW);
      doc.setLineWidth(1);
      doc.line(PW / 2 - tw2 / 2, Y + 1.5, PW / 2 + tw2 / 2, Y + 1.5);
      setColor(DARK);
      Y += 12;

      // Details table (navy labels, dark values)
      const details = [
        ['Employee Name',       safe(session.employeeName)],
        ['Offer Date',          safe(session.letterDate)],
        ['Position Title',      safe(session.position)],
        ['Employment Status',   safe(session.employmentStatus)],
        ['Term of Contract',    safe(session.employmentStatus)],
        ['Monthly Compensation',safe(session.monthlySalary)],
        ['Effective Start Date',safe(session.startDate)],
        ['Immediate Supervisor',safe(session.supervisor)],
      ];

      // Alternating row background
      details.forEach((row, i) => {
        needPage(8);
        if (i % 2 === 0) {
          setFill([245, 248, 255]);
          doc.rect(M, Y - 4.5, BODY_W, 7, 'F');
        }
        setColor(NAVY);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(row[0] + ':', M + 2, Y);
        setColor(DARK);
        doc.setFont('helvetica', 'normal');
        doc.text(row[1], M + 52, Y);
        Y += 7;
      });
      gap(8);

      para(`Dear ${safe(session.employeeName)},`);
      gap(3);
      para(`We are pleased to extend you a formal offer of employment with Dunwell Executive Healthcare and Wellness in the position of ${safe(session.position)} based in ${safe(session.placeOfWork)}.`);
      gap(3);
      para('Upon your written acceptance of this offer, the following benefits will be extended to you:');
      bullet('Paid Annual leave of 21 days.');
      bullet('Paid Sick leave to maximum accrual as governed by local country law (carry over days per law).');
      bullet('Compassionate Leave per maximum days as governed by local country law.');
      gap(8);

      section('ACCEPTANCE OF OFFER');
      para('I agree by signing below that I understand and agree to the terms and conditions of this offer extended by (Dunwell Executive Healthcare and Wellness) and no other terms apply. I agree that (Dunwell Executive Healthcare and Wellness) has made no other promises other than what is outlined in this offer letter. It contains the entire offer the DEHW is making me. Any changes in the terms of my employment, including benefits, must be authorized by the CEO & COO of the company.');
      gap(8);

      // Signing date — uses the letter date
      setColor(GREY);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9.5);
      signedAtLine();
      setColor(DARK);
      doc.setFont('helvetica', 'normal');
      gap(4);

      sigBlock('Employee Signature', session.employeeSignature, session.employeeSignedAt, safe(session.employeeName), M, 80);
      gap(6);

      section('ACKNOWLEDGEMENT OF JOB DESCRIPTION');
      para('I have read the job description for the position offered to me and agree to its contents. I acknowledge that any other duties may be requested of me that are not specially stated here. I agree to perform these duties as directed by my immediate supervisor(s) when called upon.');
      gap(8);

      sigBlock('Employee Signature', session.employeeSignature, session.employeeSignedAt, safe(session.employeeName), M, 80);
      gap(6);

      section('AGREEMENT FROM DUNWELL EXECUTIVE HEALTHCARE & WELLNESS');
      gap(4);
      // Company signature uses the Director's signature
      sigBlock('Director Signature', session.directorSignature, session.directorSignedAt, undefined, M, 80);

      footer();
    }

    const fileType = isEmploymentContract ? 'Employment_Contract' : 'Formal_Offer';
    doc.save(`Dunwell_${fileType}_${session.employeeName?.replace(/\s+/g, '_') || 'Draft'}.pdf`);
  };

  return (
    <Button
      onClick={generatePdf}
      variant="outline"
      className="w-full border-slate-200 text-[#2b3e50] hover:bg-slate-50 hover:text-primary gap-2"
    >
      <Download className="w-4 h-4" />
      Download {isEmploymentContract ? 'Employment Contract' : 'Formal Offer'} PDF
    </Button>
  );
}
