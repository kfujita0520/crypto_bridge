const mockData = {
  status: 'Activated', // Change as needed
  role: 'Borrower', // Change as needed
};

const getStatus = () => {
  return Promise.resolve(mockData.status);
}

const getRole = () => {
  return Promise.resolve(mockData.role);
}

const applyLoan = () => {
  return Promise.resolve(true);
};

const depositCollateral = (user) => {
  console.log('depositCollateral');
  return new Promise((resolve, reject) => {
    if (user.role !== 'Borrower') {
      reject('Unauthorized');
    }
    resolve(true);
  });
}

const approveLoanTerm = (user) => {
  console.log('approveLoanTerm');
  return new Promise((resolve, reject) => {
    if (user.role !== 'Lender') {
      reject('Unauthorized');
    }
    resolve(true);
  });
}

const startBorrowing = (user) => {
  console.log('startBorrowing');
  return new Promise((resolve, reject) => {
    if (user.role !== 'Borrower') {
      reject('Unauthorized');
    }
    resolve(true);
  });
}

const cancelBorrowing = (user) => {
  console.log('cancelBorrowing');
  return new Promise((resolve, reject) => {
    if (user.role !== 'Borrower') {
      reject('Unauthorized');
    }
    resolve(true);
  });
}

const redeemPrincipalInPart = (user, partial) => {
  console.log('redeemPrincipalInPart');
  return new Promise((resolve, reject) => {
    if (user.role !== 'Borrower') {
      reject('Unauthorized');
    }
    resolve(true);
  });
}
const redeemPrincipalInFull = (user, partial) => {
  console.log('redeemPrincipalInFull');
  return new Promise((resolve, reject) => {
    if (user.role !== 'Borrower') {
      reject('Unauthorized');
    }
    resolve(true);
  });
}

const lend = (user) => {
  console.log('lend');
  return new Promise((resolve, reject) => {
    if (user.role !== 'Lender') {
      reject('Unauthorized');
    }
    resolve(true);
  });
}

const claimInterest = (user) => {
  console.log('claimInterest');
  return new Promise((resolve, reject) => {
    if (user.role !== 'Lender') {
      reject('Unauthorized');
    }
    resolve(true);
  });
}

const claimPrincipal = (user) => {
  console.log('claimPrincipal');
  return new Promise((resolve, reject) => {
    if (user.role !== 'Lender') {
      reject('Unauthorized');
    }
    resolve(true);
  });
}

const liquidateCollateral = (user) => {
  console.log('liquidateCollateral');
  return new Promise((resolve, reject) => {
    if (user.role !== 'Admin') {
      reject('Unauthorized');
    }
    resolve(true);
  });
}
const getTermDetails = () => {
  return Promise.resolve({
    currency: "USDC",
    amount: 1000000,
    maturityPeriod: 30,
    startDate: "2023/11/8",
    maturityDate: "2024/8/15",
    interestRate: 5,
    collateral: {
      owner: "owner_address",
      tokenId: "token_id"
    },
    borrower: "0xfe*****3w1",
    lender: "0xuv*****b59"
  });
};

const getStatusDetails = () => {
  return Promise.resolve({
    status: "Started",
    paidInterestByLender: 2300,
    claimedInterestByBorrower: 1000,
    claimableInterest: 1300,
    withdrawablePrincipal: 50000
  });
};

export default {
  getStatus,
  getRole,
  applyLoan,
  depositCollateral,
  approveLoanTerm,
  startBorrowing,
  cancelBorrowing,
  redeemPrincipalInPart,
  redeemPrincipalInFull,
  lend,
  claimInterest,
  claimPrincipal,
  liquidateCollateral,
  getTermDetails,
  getStatusDetails
};