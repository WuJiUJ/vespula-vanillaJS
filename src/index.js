import { isVariableDeclaration } from "typescript";
import job from "./response1.json";

let firstLevelBoards = job.filter((item) => item.boardSupplyType === "2");

function groupBoardByMSB(allBoards, firstLevelBoard, levelLimit) {
  let queue = [];
  let arr = [];
  queue.push(firstLevelBoard);
  while (queue.length !== 0) {
    let board = queue.shift();

    if (board.level <= levelLimit) {
      arr.push(board);

      board.circuits.forEach((circuit) => {
        //find the child boards of this circuit
        let childBoards = allBoards.filter(
          (x) => x.boardCircuitSupplySource === circuit.circuitID
        );
        childBoards.forEach((item) => {
          if (item.statusCode === "A") {
            queue.push(item);
          }
        });
      });
    }
  }
  return arr;
}

function assignLevel(allBoards, board, parentLevel) {
  //Assign level
  board.level = parentLevel + 1;
  //Loop through board's circuits
  board.circuits.forEach((circuit) => {
    //find the child board of this circuit
    let childBoards = allBoards.filter(
      (x) => x.boardCircuitSupplySource === circuit.circuitID
    );

    //call function again if child board exist
    if (childBoards.length > 0) {
      childBoards.forEach((childBoard) => {
        assignLevel(allBoards, childBoard, board.level);
      });
    }
  });
}

function extractCircuitsFromBoards(boardsWithCircuits) {
  let circuits = [];
  let NoOfMSB = 0;
  console.log();
  boardsWithCircuits.map((board) => {
    board.Id = board.boardID;
    board.Role = board.boardName;
    board.Type = "Board";
    if (board.boardCircuitSupplySource) {
      if (board.isParentBoardHasOnlyOneCircuit) {
        board.Manager = board.boardSupplySource;
      } else {
        board.Manager = board.boardCircuitSupplySource;
      }
    } else {
      NoOfMSB++;
    }
    delete board.boardID;
    delete board.boardName;
    //sort circuits
    board.circuits.sort((a, b) => a.circuitNo - b.circuitNo);

    if (board.circuits.length == 1) {
      let circuit = board.circuits[0];
      let childBoards = boardsWithCircuits.filter(
        (x) => x.boardCircuitSupplySource === circuit.circuitID
      );
      if (childBoards) {
        childBoards.map((item) => {
          item.isParentBoardHasOnlyOneCircuit = true;
        });
      }
      // //eliminate that only circuit
      // board.circuits = board.circuits.filter(
      //   (item) => item.circuitID !== circuit.circuitID
      // );
    } else {
      board.circuits.map((circuit) => {
        //find the child boards of this circuit
        let childBoards = boardsWithCircuits.filter(
          (x) => x.boardCircuitSupplySource === circuit.circuitID
        );
        //call function again if child board exist
        if (childBoards.length > 0 && circuit.statusCode === "A") {
          circuit.Id = circuit.circuitID;
          circuit.Role = `${circuit.circuitNo}${
            circuit.circuitPhase ? circuit.circuitPhase : ""
          }`;
          circuit.Manager = board.Id;
          delete circuit.circuitID;
          delete circuit.circuitNo;
          delete circuit.circuitPhase;
          circuits.push(circuit);
        } else {
          //eliminate the unlinked circuit
          board.circuits = board.circuits.filter(
            (item) => item.circuitID !== circuit.circuitID
          );
        }
      });
    }

    if (board.circuits.length === 0) {
      board.IsLast = true;
    }
  });
  return {
    circuits,
    NoOfMSB,
  };
}

function createDigram(id, data, boardColor, circuitColor) {
  var button = document.createElement("button");
  button.setAttribute("type", "button");
  button.className = "btn btn-secondary";
  button.innerHTML = `Export ${data[0].Role}`;
  button.style.width = "100%";
  button.style.marginBottom = "10px";
  button.style.marginTop = id === 1 ? "" : "60px";
  document.getElementById("root").appendChild(button);

  var container = document.createElement("div");
  container.id = `diagram${id}`;
  container.style.border = "2px solid #000000";
  document.getElementById("root").appendChild(container);

  ej.diagrams.Diagram.Inject(
    ej.diagrams.DataBinding,
    ej.diagrams.HierarchicalTree,
    ej.diagrams.PrintAndExport
  );

  var items = new ej.data.DataManager(data, new ej.data.Query().take(7));

  var diagram = new ej.diagrams.Diagram(
    {
      width: "100%",
      height: "500px",
      snapSettings: { constraints: 0 },
      layout: {
        type: "OrganizationalChart",
        horizontalAlignment: "Left",
        verticalAlignment: "Top",
        margin: { left: 10, right: 10, top: 10, bottom: 10 },
        getLayoutInfo: (node, options) => {
          options.type = "Right";
          options.orientation = "Vertical";
        },
      },
      dataSourceSettings: {
        id: "Id",
        parentId: "Manager",
        dataManager: items,
      },

      getNodeDefaults: (obj, diagram) => {
        if (obj.data["Type"] === "Board") {
          obj.style.fill = boardColor;
        } else {
          obj.style.fill = circuitColor;
        }
        if (obj.data["hasSubTree"]) {
          obj.width = 75;
        } else {
          obj.width = 150;
        }
        obj.height = 25;
        obj.borderColor = "black";
        obj.borderWidth = 2;
        obj.annotations = [
          {
            content: obj.data["Role"],
            style: {
              color: "black",
            },
          },
        ];
        return obj;
      },
      getConnectorDefaults: (connector, diagram) => {
        connector.style = {
          strokeColor: "black",
          strokeWidth: 2,
        };
        if (connector.targetDecorator) {
          connector.targetDecorator.shape = "None";
          if (connector.targetDecorator.style) {
            connector.targetDecorator.style.fill = "#6BA5D7";
            connector.targetDecorator.style.strokeColor = "#6BA5D7";
          }
        }
        connector.type = "Orthogonal";
        return connector;
      },
    },
    `#${container.id}`
  );

  button.onclick = () => {
    let options = {};
    options.mode = "Download";
    options.margin = { left: 10, right: 10, top: 10, bottom: 10 };
    options.fileName = `${data[0].Role}`;
    options.format = "SVG";
    diagram.exportDiagram(options);
  };
}

function init(input) {
  let containerArray = [];
  firstLevelBoards.map((mainSupplyBoard) => {
    assignLevel([...job], mainSupplyBoard, 0);
  });

  if (!input.isShowMainSupply) {
    let secondLevelBoards = job.filter((item) => item.level === 2);
    secondLevelBoards.map((firstLevelBoard) => {
      containerArray.push(
        groupBoardByMSB([...job], firstLevelBoard, input.levelLimit)
      );
    });
  } else {
    firstLevelBoards.map((mainSupplyBoard) => {
      containerArray.push(
        groupBoardByMSB([...job], mainSupplyBoard, input.levelLimit)
      );
    });
  }

  let GroupsOfNodes = [];

  containerArray.map((group) => {
    let { circuits } = extractCircuitsFromBoards(group);
    GroupsOfNodes.push([...group, ...circuits]);
  });

  GroupsOfNodes.map((data, index) => {
    createDigram(index + 1, data, input.boardColor, input.circuitColor);
  });
}

let input = {
  boardColor: "#FAC72E",
  circuitColor: "#aaa",
  levelLimit: 3,
  isShowMainSupply: false,
};

init(input);
